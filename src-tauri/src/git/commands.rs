use crate::git::types::{DiffLine, FileDiff, GitFileChange, GitStatus};
use git2::{DiffOptions, Repository, StatusOptions};

fn status_to_string(status: git2::Status) -> String {
    if status.is_index_new() || status.is_wt_new() {
        "added".to_string()
    } else if status.is_index_deleted() || status.is_wt_deleted() {
        "deleted".to_string()
    } else if status.is_index_renamed() || status.is_wt_renamed() {
        "renamed".to_string()
    } else {
        "modified".to_string()
    }
}

#[tauri::command]
pub fn git_status(path: String) -> Result<GitStatus, String> {
    let repo = Repository::open(&path).map_err(|e| e.to_string())?;

    let head = repo.head().ok();
    let branch = head
        .and_then(|h| h.shorthand().map(|s| s.to_string()))
        .unwrap_or_else(|| "HEAD".to_string());

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);

    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;

    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    let mut untracked = Vec::new();

    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").to_string();
        let status = entry.status();

        if status.is_wt_new() {
            untracked.push(path.clone());
        }

        if status.is_index_new()
            || status.is_index_modified()
            || status.is_index_deleted()
            || status.is_index_renamed()
            || status.is_index_typechange()
        {
            staged.push(GitFileChange {
                path: path.clone(),
                status: status_to_string(status),
            });
        }

        if status.is_wt_modified()
            || status.is_wt_deleted()
            || status.is_wt_renamed()
            || status.is_wt_typechange()
        {
            unstaged.push(GitFileChange {
                path,
                status: status_to_string(status),
            });
        }
    }

    Ok(GitStatus {
        branch,
        staged,
        unstaged,
        untracked,
    })
}

#[tauri::command]
pub fn git_diff(repo_path: String, file_path: String) -> Result<FileDiff, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    let mut diff_opts = DiffOptions::new();
    diff_opts.pathspec(&file_path);

    // Get diff between HEAD and working directory
    let diff = repo
        .diff_index_to_workdir(None, Some(&mut diff_opts))
        .map_err(|e| e.to_string())?;

    let mut lines = Vec::new();

    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let content = std::str::from_utf8(line.content())
            .unwrap_or("")
            .to_string();

        let kind = match line.origin() {
            '+' => "add",
            '-' => "del",
            '@' => "hunk",
            _ => "context",
        }
        .to_string();

        lines.push(DiffLine {
            kind,
            content,
            old_lineno: line.old_lineno(),
            new_lineno: line.new_lineno(),
        });

        true
    })
    .map_err(|e| e.to_string())?;

    Ok(FileDiff {
        path: file_path,
        lines,
    })
}

#[tauri::command]
pub fn git_diff_all(repo_path: String) -> Result<Vec<FileDiff>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    // Get diff between HEAD and working directory
    let diff = repo
        .diff_index_to_workdir(None, None)
        .map_err(|e| e.to_string())?;

    let mut file_diffs: Vec<FileDiff> = Vec::new();
    let mut current_path: Option<String> = None;
    let mut current_lines: Vec<DiffLine> = Vec::new();

    diff.print(git2::DiffFormat::Patch, |delta, _hunk, line| {
        let delta_path = delta
            .new_file()
            .path()
            .or_else(|| delta.old_file().path())
            .and_then(|p| p.to_str())
            .map(|s| s.to_string());

        // If we're on a new file, save the previous one
        if delta_path != current_path {
            if let Some(path) = current_path.take() {
                file_diffs.push(FileDiff {
                    path,
                    lines: std::mem::take(&mut current_lines),
                });
            }
            current_path = delta_path;
        }

        let content = std::str::from_utf8(line.content())
            .unwrap_or("")
            .to_string();

        let kind = match line.origin() {
            '+' => "add",
            '-' => "del",
            '@' => "hunk",
            _ => "context",
        }
        .to_string();

        current_lines.push(DiffLine {
            kind,
            content,
            old_lineno: line.old_lineno(),
            new_lineno: line.new_lineno(),
        });

        true
    })
    .map_err(|e| e.to_string())?;

    // Don't forget the last file
    if let Some(path) = current_path {
        file_diffs.push(FileDiff {
            path,
            lines: current_lines,
        });
    }

    Ok(file_diffs)
}

#[tauri::command]
pub fn git_current_branch(path: String) -> Result<String, String> {
    let repo = Repository::open(&path).map_err(|e| e.to_string())?;

    let head = repo.head().map_err(|e| e.to_string())?;
    let branch = head
        .shorthand()
        .map(|s| s.to_string())
        .unwrap_or_else(|| "HEAD".to_string());

    Ok(branch)
}
