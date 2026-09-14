use std::ffi::OsStr;
use std::process::Command;

/// Build a `Command` that does not flash a console window on Windows.
///
/// Prevents helper `git` / `gh` / `where` processes from attaching to an open
/// ConPTY session (in-app terminal) or bouncing Windows Terminal.
pub fn command(program: impl AsRef<OsStr>) -> Command {
    let mut cmd = Command::new(program);
    apply_no_window(&mut cmd);
    cmd
}

pub fn apply_no_window(cmd: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(not(windows))]
    {
        let _ = cmd;
    }
}
