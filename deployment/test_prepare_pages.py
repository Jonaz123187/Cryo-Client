import hashlib
import io
import json
import unittest
from pathlib import Path
import tempfile
import zipfile
from prepare_pages import from_archive, render_html, validate_release


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


if __name__ == "__main__":unittest.main()
