use crate::types::{
    CommandStatus, ExecutionHistoryItem, HistoryStats, LiveExecution, Pipeline, PipelineStep,
    RunQueueItem, StepState,
};
use std::collections::HashMap;
use std::time::Duration;

pub fn current_timestamp() -> String {
    let now = chrono::Local::now();
    now.format("%Y-%m-%d %H:%M").to_string()
}

pub fn format_duration(duration: Duration) -> String {
    let total_secs = duration.as_secs();
    let minutes = total_secs / 60;
    let seconds = total_secs % 60;
    format!("{:02}:{:02}", minutes, seconds)
}

pub fn parse_duration(label: &str) -> Option<u64> {
    let parts: Vec<&str> = label.split(':').collect();
    if parts.len() != 2 {
        return None;
    }
    let minutes = parts[0].parse::<u64>().ok()?;
    let seconds = parts[1].parse::<u64>().ok()?;
    Some(minutes * 60 + seconds)
}

pub fn recompute_history_stats(items: &[ExecutionHistoryItem]) -> HistoryStats {
    let total_runs = items.len() as u32;
    let success_runs = items
        .iter()
        .filter(|item| item.status == CommandStatus::Success)
        .count() as u32;
    let success_rate = if total_runs == 0 {
        "0%".to_string()
    } else {
        format!("{:.0}%", (success_runs as f32 / total_runs as f32) * 100.0)
    };

    let durations: Vec<u64> = items
        .iter()
        .filter_map(|item| parse_duration(&item.duration))
        .collect();
    let avg_duration = if durations.is_empty() {
        "00:00".to_string()
    } else {
        let sum: u64 = durations.iter().sum();
        let avg = sum / durations.len() as u64;
        format_duration(Duration::from_secs(avg))
    };

    HistoryStats {
        total_runs,
        success_rate,
        avg_duration,
    }
}

pub fn recompute_pipelines(
    live_executions: &[LiveExecution],
    run_queue: &[RunQueueItem],
) -> Vec<Pipeline> {
    let mut by_repo: HashMap<String, Vec<PipelineStep>> = HashMap::new();

    for execution in live_executions {
        by_repo
            .entry(execution.repo.clone())
            .or_default()
            .push(PipelineStep {
                label: execution.command.clone(),
                state: StepState::Running,
            });
    }

    for item in run_queue {
        by_repo
            .entry(item.repo.clone())
            .or_default()
            .push(PipelineStep {
                label: item.name.clone(),
                state: StepState::Pending,
            });
    }

    let mut pipelines: Vec<Pipeline> = by_repo
        .into_iter()
        .map(|(repo, steps)| Pipeline { repo, steps })
        .collect();
    pipelines.sort_by(|a, b| a.repo.cmp(&b.repo));
    pipelines
}
