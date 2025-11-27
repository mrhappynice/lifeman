mod handlers;
mod model;

use axum::{
    routing::{get, put, delete}, // post is implied in route chaining
    Router,
};
use std::net::SocketAddr;
use tower_http::{services::ServeDir, trace::TraceLayer};
use model::AppState;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state = AppState::new("data.json");

    let app = Router::new()
        .route("/api/entries", get(handlers::list_entries).post(handlers::create_entry))
        .route("/api/entries/:id", put(handlers::update_entry).delete(handlers::delete_entry)) 
        .nest_service("/", ServeDir::new("static"))
        .with_state(state)
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([127, 0, 0, 1], 3030));
    println!("Life Manager running at http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
