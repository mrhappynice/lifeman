use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use uuid::Uuid;
use serde_json::Value;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entry {
    #[serde(default = "Uuid::new_v4")]
    pub id: Uuid,
    pub template_type: String, 
    pub title: String,         
    
    #[serde(default)] 
    pub description: String,
    
    #[serde(default)] 
    pub tags: Vec<String>,     
    
    pub frequency: Option<String>, 
    
    #[serde(default = "default_status")] 
    pub status: String,

    // NEW FIELD: Holds specific appointment times
    #[serde(default)]
    pub event_date: Option<DateTime<Utc>>, 
    
    pub details: Value,        
    
    #[serde(default = "Utc::now")]
    pub created_at: DateTime<Utc>,
    
    pub updated_at: Option<DateTime<Utc>>,
}

// Helper function for the default value
fn default_status() -> String {
    "Active".to_string()
}

#[derive(Clone)]
pub struct AppState {
    pub entries: Arc<Mutex<Vec<Entry>>>,
    pub file_path: String,
}

impl AppState {
    pub fn new(file_path: &str) -> Self {
        // Try to read file, otherwise create empty list
        let entries = match std::fs::read_to_string(file_path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => Vec::new(),
        };
        Self {
            entries: Arc::new(Mutex::new(entries)),
            file_path: file_path.to_string(),
        }
    }

    pub fn save(&self) {
        let entries = self.entries.lock().unwrap();
        let content = serde_json::to_string_pretty(&*entries).unwrap();
        // Added error printing so you can see if file permissions are wrong
        if let Err(e) = std::fs::write(&self.file_path, content) {
            eprintln!("CRITICAL ERROR: Could not save data.json: {}", e);
        } else {
            println!("Database saved to {}", self.file_path);
        }
    }
}
