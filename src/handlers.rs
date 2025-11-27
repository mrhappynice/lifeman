use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use uuid::Uuid;
use chrono::Utc;
use crate::model::{Entry, AppState};

pub async fn list_entries(State(state): State<AppState>) -> Json<Vec<Entry>> {
    let entries = state.entries.lock().unwrap();
    let mut sorted = entries.clone();
    // Sort: Pinned/Daily first, then by date
    sorted.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Json(sorted)
}

pub async fn create_entry(
    State(state): State<AppState>,
    Json(mut payload): Json<Entry>,
) -> Json<Entry> {
    if payload.id == Uuid::nil() { payload.id = Uuid::new_v4(); }
    payload.created_at = Utc::now();
    payload.status = "Active".to_string();
    
    {
        let mut entries = state.entries.lock().unwrap();
        entries.push(payload.clone());
    }
    state.save();
    Json(payload)
}

pub async fn update_entry(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<Entry>,
) -> StatusCode {
    let mut entries = state.entries.lock().unwrap();
    if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
        entry.title = payload.title;
        entry.description = payload.description;
        entry.tags = payload.tags;
        entry.frequency = payload.frequency;
        entry.details = payload.details;
        entry.event_date = payload.event_date; 
        entry.updated_at = Some(Utc::now());
        drop(entries);
        state.save();
        StatusCode::OK
    } else {
        StatusCode::NOT_FOUND
    }
}

pub async fn delete_entry(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> StatusCode {
    let mut entries = state.entries.lock().unwrap();
    entries.retain(|e| e.id != id);
    drop(entries);
    state.save();
    StatusCode::NO_CONTENT
}
