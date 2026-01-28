use dashmap::mapref::entry::Entry;
use dashmap::DashMap;
use serde::Serialize;
use std::net::TcpListener;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;

#[derive(Debug, Clone, Serialize)]
pub struct Lease {
    pub port: u16,
    pub owner: String,
    pub purpose: Option<String>,
    pub created_at: u64,
}

#[derive(Debug, Default)]
pub struct PortRegistry {
    leases: DashMap<u16, Lease>,
}

impl PortRegistry {
    pub fn new() -> Self {
        Self {
            leases: DashMap::new(),
        }
    }

    fn now_millis() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis() as u64)
            .unwrap_or(0)
    }

    pub fn lease_port(
        &self,
        port: u16,
        owner: String,
        purpose: Option<String>,
    ) -> Result<Lease, String> {
        let lease = Lease {
            port,
            owner: owner.clone(),
            purpose,
            created_at: Self::now_millis(),
        };

        match self.leases.entry(port) {
            Entry::Occupied(mut existing) => {
                if existing.get().owner != owner {
                    return Err(format!(
                        "port {port} already leased by {}",
                        existing.get().owner
                    ));
                }
                existing.insert(lease.clone());
                Ok(lease)
            }
            Entry::Vacant(slot) => {
                slot.insert(lease.clone());
                Ok(lease)
            }
        }
    }

    pub fn release_port(&self, port: u16, owner: String) -> Result<(), String> {
        match self.leases.entry(port) {
            Entry::Occupied(existing) => {
                if existing.get().owner != owner {
                    return Err(format!(
                        "port {port} leased by {}, not {owner}",
                        existing.get().owner
                    ));
                }
                existing.remove();
                Ok(())
            }
            Entry::Vacant(_) => Err(format!("port {port} not leased")),
        }
    }

    pub fn list_leases(&self) -> Vec<Lease> {
        let mut leases: Vec<Lease> = self.leases.iter().map(|item| item.value().clone()).collect();
        leases.sort_by_key(|lease| lease.port);
        leases
    }

    pub fn allocate_port_and_lease(
        &self,
        owner: String,
        purpose: Option<String>,
    ) -> Result<Lease, String> {
        let attempts = 10;
        for _ in 0..attempts {
            let listener = TcpListener::bind(("127.0.0.1", 0))
                .map_err(|error| error.to_string())?;
            let port = listener
                .local_addr()
                .map_err(|error| error.to_string())?
                .port();
            drop(listener);

            if let Ok(lease) = self.lease_port(port, owner.clone(), purpose.clone()) {
                return Ok(lease);
            }
        }

        Err("failed to allocate a free port after multiple attempts".to_string())
    }
}

#[tauri::command]
pub fn port_registry_lease_port(
    registry: State<'_, PortRegistry>,
    port: u16,
    owner: String,
    purpose: Option<String>,
) -> Result<Lease, String> {
    registry.lease_port(port, owner, purpose)
}

#[tauri::command]
pub fn port_registry_release_port(
    registry: State<'_, PortRegistry>,
    port: u16,
    owner: String,
) -> Result<(), String> {
    registry.release_port(port, owner)
}

#[tauri::command]
pub fn port_registry_list_leases(registry: State<'_, PortRegistry>) -> Vec<Lease> {
    registry.list_leases()
}

#[tauri::command]
pub fn port_registry_allocate_port_and_lease(
    registry: State<'_, PortRegistry>,
    owner: String,
    purpose: Option<String>,
) -> Result<Lease, String> {
    registry.allocate_port_and_lease(owner, purpose)
}
