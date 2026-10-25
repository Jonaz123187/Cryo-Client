use base64::{engine::general_purpose::STANDARD, Engine};
use minisign_verify::{PublicKey, Signature};
use std::{error::Error, fs, path::PathBuf};

fn main() -> Result<(), Box<dyn Error>> {
    let mut args = std::env::args().skip(1);
    let folder = PathBuf::from(args.next().ok_or("Missing deployment directory")?);
    let key_file = args.next().ok_or("Missing public key")?;
    let manifest: serde_json::Value = serde_json::from_slice(&fs::read(folder.join("release.json"))?)?;
    let version = manifest["version"].as_str().ok_or("Missing version")?;
    // The independently validated version is still checked before constructing a path.
    if version.is_empty() || !version.bytes().all(|c| c.is_ascii_digit() || c == b'.') {return Err("Invalid version".into());}
    let filename = format!("Nivo-Client-{version}-Setup.exe");
    let feed: serde_json::Value = serde_json::from_slice(&fs::read(folder.join("updates/latest.json"))?)?;
    let encoded = feed["platforms"]["windows-x86_64"]["signature"].as_str().ok_or("Missing signature")?;
    let key_text = String::from_utf8(STANDARD.decode(fs::read_to_string(key_file)?.trim())?)?;
    let signature_text = String::from_utf8(STANDARD.decode(encoded.trim())?)?;
    let key = PublicKey::decode(&key_text)?;
    let signature = Signature::decode(&signature_text)?;
    key.verify(&fs::read(folder.join("downloads").join(filename))?, &signature, true)?;
    let signed_version = signature.trusted_comment().split('\t').find_map(|field|field.strip_prefix("version:"));
    if signed_version != Some(version) {return Err("Signature does not cover the announced version".into());}
    println!("Nivo {version}: installer and signed version verified.");
    Ok(())
}
