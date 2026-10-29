"""Build a static deployment from trusted website sources and a signed release.

Release ZIPs are data only: never execute their scripts or deploy a bundled Worker.
Until the first GitHub Release exists, use the pinned, already published 0.4.0.
"""
import argparse
import hashlib
import html
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import urllib.error
import urllib.parse
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://nivo-client.pages.dev"
LEGACY_ORIGIN = "https://cryo-client.pages.dev"
REPOSITORY = "Jonaz123187/Nivo-Client"
MAX_FILE = 25 * 1024 * 1024
MAX_INSTALLER = 128 * 1024 * 1024
VERSION = re.compile(r"[0-9]+\.[0-9]+\.[0-9]+")


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        target = urllib.parse.urlsplit(newurl)
        if target.scheme != "https" or target.hostname not in {
            "github.com", "api.github.com", "release-assets.githubusercontent.com",
            "objects.githubusercontent.com", "cryo-client.pages.dev", "nivo-client.pages.dev",
        }:
            raise ValueError("Unsupported download redirect")
        result = super().redirect_request(req, fp, code, msg, headers, newurl)
        if result and target.hostname != urllib.parse.urlsplit(req.full_url).hostname:
            result.remove_header("Authorization")
        return result


def fetch(url, limit, api=False):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError("Only HTTPS downloads are supported")
    headers = {"User-Agent": "Nivo-Release-Deployment/1", "Accept": "application/vnd.github+json" if api else "application/octet-stream"}
    if api:
        if parsed.hostname != "api.github.com":
            raise ValueError("Invalid API host")
        token = os.environ.get("GITHUB_TOKEN")
        if token:
            headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.build_opener(SafeRedirect()).open(request, timeout=60) as response:
        if int(response.headers.get("Content-Length", "0")) > limit:
            raise ValueError("Download is too large")
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError("Download is too large")
    return data


def validate_release(manifest, feed, installer, expected_version=None):
    version = manifest.get("version", "")
    if not isinstance(version, str) or not VERSION.fullmatch(version):
        raise ValueError("Invalid release version")
    if expected_version and version != expected_version:
        raise ValueError("Release ZIP does not match its GitHub tag")
    relative = f"downloads/Nivo-Client-{version}-Setup.exe"
    if manifest.get("file") != "/" + relative:
        raise ValueError("Unexpected installer path")
    if not installer.startswith(b"MZ") or len(installer) >= MAX_INSTALLER or len(installer) != manifest.get("bytes"):
        raise ValueError("Invalid Windows installer or size")
    checksum = manifest.get("sha256", "")
    if not isinstance(checksum, str) or not re.fullmatch(r"[a-f0-9]{64}", checksum) or hashlib.sha256(installer).hexdigest() != checksum:
        raise ValueError("Installer SHA-256 mismatch")
    windows = feed.get("platforms", {}).get("windows-x86_64", {})
    if feed.get("version") != version or windows.get("url") not in {ORIGIN + "/" + relative, LEGACY_ORIGIN + "/" + relative}:
        raise ValueError("Update feed does not match the release")
    signature = windows.get("signature", "")
    if not isinstance(signature, str) or len(signature) > 4096 or not re.fullmatch(r"[A-Za-z0-9+/=]+", signature):
        raise ValueError("Missing update signature")
    highlights = manifest.get("highlights", [])
    if not isinstance(highlights, list) or len(highlights) > 8 or any(not isinstance(text, str) or len(text) > 180 for text in highlights):
        raise ValueError("Invalid release highlights")
    return relative


def from_archive(data, expected_version=None, installer_fetch=None):
    if len(data) > 64 * 1024 * 1024:
        raise ValueError("Archive is too large")
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        seen, size = set(), 0
        if len(archive.infolist()) > 1000:
            raise ValueError("Too many archive entries")
        for entry in archive.infolist():
            name = entry.orig_filename
            parts = PurePosixPath(name).parts
            size += entry.file_size
            if (not name or name.startswith("/") or "\\" in name or "\0" in name or ":" in name or ".." in parts
                    or name.casefold() in seen or stat.S_ISLNK(entry.external_attr >> 16)
                    or entry.file_size >= MAX_FILE or size > 96 * 1024 * 1024):
                raise ValueError("Unsafe archive entry")
            seen.add(name.casefold())
        for name in ("release.json", "updates/latest.json"):
            if archive.getinfo(name).file_size > 65536:
                raise ValueError("Release metadata is too large")
        manifest = json.loads(archive.read("release.json"))
        feed = json.loads(archive.read("updates/latest.json"))
        version = manifest.get("version", "")
        if not isinstance(version, str) or not VERSION.fullmatch(version):
            raise ValueError("Invalid release version")
        if expected_version and version != expected_version:
            raise ValueError("Release ZIP does not match its GitHub tag")
        filename = f"downloads/Nivo-Client-{version}-Setup.exe"
        if filename in archive.namelist():
            installer = archive.read(filename)
            if archive.read("downloads/Nivo-Client-Setup.exe") != installer:
                raise ValueError("Stable installer differs from the versioned file")
        elif installer_fetch is not None:
            installer = installer_fetch(version)
        else:
            raise ValueError("Metadata-only release needs its separately verified installer")
        validate_release(manifest, feed, installer, expected_version)
    return manifest, feed, installer


def github_release(tag=None):
    if tag:
        version = tag.removeprefix("v")
        if not VERSION.fullmatch(version):
            raise ValueError("Only stable semantic-version tags are supported")
        endpoint = "tags/" + urllib.parse.quote(tag, safe="")
    else:
        endpoint = "latest"
    try:
        release = json.loads(fetch(f"https://api.github.com/repos/{REPOSITORY}/releases/{endpoint}", 1024 * 1024, api=True))
    except urllib.error.HTTPError as error:
        if error.code == 404 and not tag:
            return None
        raise RuntimeError(f"GitHub Release lookup failed (HTTP {error.code})") from None
    if release.get("draft") or release.get("prerelease"):
        raise ValueError("Draft and prerelease builds are not production releases")
    version = release.get("tag_name", "").removeprefix("v")
    if not VERSION.fullmatch(version):
        raise ValueError("Unsupported release tag")
    name = f"Nivo-Website-{version}-Cloudflare.zip"
    assets = [asset for asset in release.get("assets", []) if asset.get("name") == name]
    if len(assets) != 1:
        raise ValueError(f"The release must contain exactly one {name}")
    url = assets[0].get("browser_download_url", "")
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname != "github.com" or not parsed.path.startswith(f"/{REPOSITORY}/releases/download/"):
        raise ValueError("Invalid GitHub asset URL")
    return from_archive(fetch(url, 64 * 1024 * 1024), version,
        lambda v: fetch(f"https://github.com/{REPOSITORY}/releases/download/v{v}/Nivo-Client-{v}-Setup.exe", MAX_INSTALLER))


def bootstrap():
    manifest = json.loads((ROOT / "deployment/bootstrap/release.json").read_text(encoding="utf-8-sig"))
    feed = json.loads((ROOT / "deployment/bootstrap/latest.json").read_text(encoding="utf-8-sig"))
    version = manifest.get("version", "")
    if not isinstance(version, str) or not VERSION.fullmatch(version):
        raise ValueError("Invalid bootstrap version")
    expected = f"/downloads/Nivo-Client-{version}-Setup.exe"
    if manifest.get("file") != expected:
        raise ValueError("Invalid bootstrap file")
    installer = fetch(LEGACY_ORIGIN + expected, MAX_FILE)
    validate_release(manifest, feed, installer)
    return manifest, feed, installer


def render_html(source, manifest, output):
    version = manifest["version"]
    result = re.sub(r'(<[^>]*\bdata-release-version(?:="[^"]*")?[^>]*>)[^<]*', lambda match: match[1] + version, source)
    display_size = f'{manifest["bytes"] / 1048576:.1f}'.replace(".", ",")
    result = re.sub(r'(<[^>]*\bid="download-size"[^>]*>)[^<]*', lambda match: match[1] + f"{display_size} MB · Version {version}", result)
    items = "".join("<li>" + html.escape(text) + "</li>" for text in manifest.get("highlights", []))
    result = re.sub(r'(<ul[^>]*\bid="release-highlights"[^>]*>).*?(</ul>)', lambda match: match[1] + items + match[2], result, flags=re.S)
    if not items:
        result = result.replace('class="release-highlights"', 'class="release-highlights" hidden')
    def asset_url(match):
        pathname = urllib.parse.urlsplit(match[2]).path
        target = (output / pathname.lstrip("/")).resolve()
        if not target.is_relative_to(output.resolve()):
            raise ValueError("Unsafe frontend asset path")
        digest = hashlib.sha256(target.read_bytes()).hexdigest()[:12]
        return f'{match[1]}="{pathname}?v={digest}"'
    return re.sub(r'(src|href)="(/[^"#]+?\.(?:css|js)(?:\?[^"#]*)?)"', asset_url, result)


def build(output, payload):
    manifest, feed, installer = payload
    relative = validate_release(manifest, feed, installer)
    # Existing signed releases stay valid while download hosting migrates.
    feed = json.loads(json.dumps(feed))
    feed["platforms"]["windows-x86_64"]["url"] = ORIGIN + "/" + relative
    if output.exists() and any(output.iterdir()):
        raise ValueError("Deployment output must be empty")
    output.mkdir(parents=True, exist_ok=True)
    for source in (ROOT / "website").rglob("*"):
        relative_source = source.relative_to(ROOT / "website")
        if source.is_symlink() or any(part.startswith(".") for part in relative_source.parts):
            raise ValueError("Unsupported frontend file")
        if source.is_file():
            if source.suffix not in {".html", ".css", ".js", ".json", ".webp", ".png", ".svg", ".ico", ".txt"} and source.name not in {"_headers", "_redirects"}:
                raise ValueError("Unexpected frontend file type")
            if source.stat().st_size >= MAX_FILE:
                raise ValueError("Frontend asset is too large")
            target = output / relative_source
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
    (output / "downloads").mkdir(exist_ok=True)
    (output / "updates").mkdir(exist_ok=True)
    (output / relative).write_bytes(installer)
    (output / "downloads/Nivo-Client-Setup.exe").write_bytes(installer)
    (output / "release.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / "updates/latest.json").write_text(json.dumps(feed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    page = output / "index.html"
    page.write_text(render_html(page.read_text(encoding="utf-8-sig"), manifest, output), encoding="utf-8")
    return manifest["version"]


def externalize(output):
    output = output.resolve()
    manifest = json.loads((output / "release.json").read_text(encoding="utf-8"))
    feed = json.loads((output / "updates/latest.json").read_text(encoding="utf-8"))
    version = manifest.get("version", "")
    if not isinstance(version, str) or not VERSION.fullmatch(version):
        raise ValueError("Invalid release version")
    target = output / f"downloads/Nivo-Client-{version}-Setup.exe"
    stable = output / "downloads/Nivo-Client-Setup.exe"
    if any(path.is_symlink() or not path.resolve().is_relative_to(output) for path in (target, stable)):
        raise ValueError("Unsafe installer path")
    installer = target.read_bytes()
    relative = validate_release(manifest, feed, installer)
    if stable.read_bytes() != installer:
        raise ValueError("Stable installer differs from the verified file")
    url = f"https://github.com/{REPOSITORY}/releases/download/v{version}/Nivo-Client-{version}-Setup.exe"
    redirects = output / "_redirects"
    text = redirects.read_text(encoding="utf-8") if redirects.exists() else ""
    routes = {"/" + relative, "/downloads/Nivo-Client-Setup.exe"}
    text = "\n".join(line for line in text.splitlines() if not line.split() or line.split()[0] not in routes)
    redirects.write_text(text.rstrip() + "\n" + "\n".join(f"{route} {url} 302" for route in sorted(routes)) + "\n", encoding="utf-8")
    target.unlink()
    stable.unlink()
    for path in output.rglob("*"):
        if path.is_file() and (path.stat().st_size >= MAX_FILE or path.suffix == ".exe"):
            raise ValueError("Unexpected binary or oversized file in Pages output")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--archive", type=Path, help="Local release ZIP, for validation")
    parser.add_argument("--installer", type=Path, help="Local installer for a metadata-only release ZIP")
    parser.add_argument("--externalize", action="store_true", help="After signature verification, replace installer copies with trusted GitHub redirects")
    args = parser.parse_args()
    if args.externalize:
        externalize(args.output)
        print("Installer bytes verified; Pages now serves fixed GitHub Release redirects.")
        return
    if args.archive:
        payload = from_archive(args.archive.read_bytes(), installer_fetch=(lambda v: args.installer.read_bytes()) if args.installer else None)
    else:
        payload = github_release(os.environ.get("NIVO_RELEASE_TAG") or None)
        if payload is None:
            print("No GitHub Release yet; using the pinned, signed public bootstrap release.")
            payload = bootstrap()
    version = build(args.output, payload)
    print(f"Prepared Nivo {version} from trusted website sources. Signature verification is the next required step.")


if __name__ == "__main__":
    main()
