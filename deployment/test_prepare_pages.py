import hashlib
import io
import json
import unittest
from unittest import mock
from pathlib import Path
import tempfile
import zipfile
from prepare_pages import from_archive, render_html, validate_release, externalize, MAX_FILE


def payload():
    installer = b"MZtest installer"
    manifest = {"version":"0.4.1","file":"/downloads/Nivo-Client-0.4.1-Setup.exe","bytes":len(installer),"sha256":hashlib.sha256(installer).hexdigest(),"highlights":["Fixes"]}
    feed = {"version":"0.4.1","platforms":{"windows-x86_64":{"url":"https://cryo-client.pages.dev"+manifest["file"],"signature":"YWJjZA=="}}}
    return manifest, feed, installer


def archive(extra=None):
    manifest,feed,installer=payload()
    data=io.BytesIO()
    with zipfile.ZipFile(data,"w") as file:
        for name,body in {"release.json":json.dumps(manifest),"updates/latest.json":json.dumps(feed),manifest["file"].lstrip("/"):installer,"downloads/Nivo-Client-Setup.exe":installer,**(extra or {})}.items():
            file.writestr(name,body)
    return data.getvalue()


class DeploymentTests(unittest.TestCase):
    def test_pinned_starter_is_independent_of_versioned_installer(self):
        manifest, feed, installer = payload()
        starter = b"MZ-stable-installer-fixture"
        pinned = {"file":"/downloads/Nivo-Client-Setup.exe", "url":"https://github.com/Jonaz123187/Nivo-Client/releases/download/v0.8.1/Nivo-Installer-v1.exe", "sha256":hashlib.sha256(starter).hexdigest(), "bytes":len(starter), "version":"1.0.0"}
        manifest["bootstrap"] = pinned
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "deployment").mkdir()
            (root / "deployment/installer-starter.json").write_text(json.dumps(pinned), encoding="utf-8")
            output = root / "out"
            (output / "downloads").mkdir(parents=True)
            (output / "updates").mkdir()
            (output / "release.json").write_text(json.dumps(manifest), encoding="utf-8")
            (output / "updates/latest.json").write_text(json.dumps(feed), encoding="utf-8")
            (output / manifest["file"].lstrip("/")).write_bytes(installer)
            stable = output / "downloads/Nivo-Client-Setup.exe"
            stable.write_bytes(starter + b"modified")
            with mock.patch("prepare_pages.ROOT", root):
                with self.assertRaises(ValueError): externalize(output)
                stable.write_bytes(starter)
                externalize(output)
            routes = (output / "_redirects").read_text(encoding="utf-8")
            self.assertIn("/downloads/Nivo-Client-Setup.exe " + pinned["url"] + " 302", routes)
            self.assertIn("/downloads/Nivo-Client-0.4.1-Setup.exe https://github.com/Jonaz123187/Nivo-Client/releases/download/v0.4.1/Nivo-Client-0.4.1-Setup.exe 302", routes)

    def test_valid_archive_and_expected_tag(self):
        self.assertEqual(from_archive(archive(),"0.4.1")[0]["version"],"0.4.1")
        with self.assertRaises(ValueError):from_archive(archive(),"0.4.2")

    def test_path_traversal_and_case_duplicates_are_rejected(self):
        for path in ("../escape", "/absolute", "C:/bad", "Release.json"):
            with self.subTest(path=path),self.assertRaises(ValueError):from_archive(archive({path:b"bad"}))
        # ZipInfo normalizes Windows separators while writing; test the raw archive names.
        with self.assertRaises(ValueError):from_archive(archive({"a/bad":b"bad"}).replace(b"a/bad",b"a\\bad"))

    def test_altered_bytes_and_feed_are_rejected(self):
        manifest,feed,installer=payload()
        with self.assertRaises(ValueError):validate_release(manifest,feed,installer+b"tamper")
        feed["platforms"]["windows-x86_64"]["url"]="https://outside.example/installer.exe"
        with self.assertRaises(ValueError):validate_release(manifest,feed,installer)

    def test_stable_copy_must_equal_signed_file(self):
        with self.assertRaises(ValueError):from_archive(archive({"downloads/Nivo-Client-Setup.exe":b"wrong"}))

    def test_render_updates_fallbacks_and_escapes_release_notes(self):
        manifest,_,_=payload()
        manifest["highlights"]=["<script>untrusted</script>"]
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/"app.js").write_text("safe",encoding="utf-8")
            source='<b data-release-version>0.4.0</b><span id="download-size">old</span><ul id="release-highlights"><li>old</li></ul><script src="/app.js?v=old"></script>'
            result=render_html(source,manifest,root)
            self.assertIn('data-release-version>0.4.1',result)
            self.assertIn('&lt;script&gt;',result)
            self.assertNotIn('/app.js?v=old',result)
            self.assertIn('Version 0.4.1',result)


class ExternalInstallerTests(unittest.TestCase):
    def metadata_archive(self):
        manifest, feed, installer = payload()
        data = io.BytesIO()
        with zipfile.ZipFile(data, "w") as archive:
            archive.writestr("release.json", json.dumps(manifest))
            archive.writestr("updates/latest.json", json.dumps(feed))
        return data.getvalue(), manifest, feed, installer

    def test_metadata_only_archive_requires_explicit_installer_source(self):
        archive, manifest, feed, installer = self.metadata_archive()
        with self.assertRaises(ValueError): from_archive(archive)
        versions = []
        def download(version):
            versions.append(version)
            return installer
        self.assertEqual(from_archive(archive, manifest["version"], download), (manifest, feed, installer))
        self.assertEqual(versions, [manifest["version"]])
        with self.assertRaises(ValueError): from_archive(archive, manifest["version"], lambda v: installer + b"tamper")
        with self.assertRaises(ValueError): from_archive(archive, "99.0.0", download)
        self.assertEqual(len(versions), 1)

    def test_externalize_keeps_only_fixed_repository_download_redirects(self):
        manifest, feed, installer = payload()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "downloads").mkdir()
            (root / "updates").mkdir()
            (root / "release.json").write_text(json.dumps(manifest), encoding="utf-8")
            (root / "updates/latest.json").write_text(json.dumps(feed), encoding="utf-8")
            target = root / manifest["file"].lstrip("/")
            stable = root / "downloads/Nivo-Client-Setup.exe"
            target.write_bytes(installer)
            stable.write_bytes(installer + b"wrong")
            with self.assertRaises(ValueError): externalize(root)
            self.assertTrue(target.exists())
            stable.write_bytes(installer)
            externalize(root)
            self.assertFalse(target.exists())
            self.assertFalse(stable.exists())
            routes = (root / "_redirects").read_text(encoding="utf-8")
            self.assertIn("/downloads/Nivo-Client-Setup.exe https://github.com/Jonaz123187/Nivo-Client/releases/download/v0.4.1/Nivo-Client-0.4.1-Setup.exe 302", routes)

    def test_signed_installer_may_exceed_pages_file_limit(self):
        manifest, feed, _ = payload()
        installer = b"MZ" + bytes(MAX_FILE)
        manifest.update(bytes=len(installer), sha256=hashlib.sha256(installer).hexdigest())
        validate_release(manifest, feed, installer)


if __name__ == "__main__":unittest.main()

