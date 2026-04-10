use std::env;
use std::process::Command;

fn command_output(program: &str, args: &[&str]) -> Option<String> {
    let output = Command::new(program).args(args).output().ok()?;
    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8(output.stdout).ok()?;
    let trimmed = stdout.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=../.git/HEAD");

    let git_sha = command_output("git", &["rev-parse", "--short", "HEAD"])
        .unwrap_or_else(|| "unknown".to_string());
    let build_date =
        command_output("date", &["-u", "+%F"]).unwrap_or_else(|| "unknown".to_string());
    let rust_version = command_output("rustc", &["--version"])
        .and_then(|value| value.split_whitespace().nth(1).map(str::to_string))
        .unwrap_or_else(|| "unknown".to_string());
    let build_target = env::var("TARGET").unwrap_or_else(|_| "unknown".to_string());

    println!("cargo:rustc-env=APW_GIT_SHA={git_sha}");
    println!("cargo:rustc-env=APW_BUILD_DATE={build_date}");
    println!("cargo:rustc-env=APW_RUST_VERSION={rust_version}");
    println!("cargo:rustc-env=APW_BUILD_TARGET={build_target}");
}
