use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationSummary {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub status: String,
    pub state: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub repository_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageMeta {
    pub provider: String,
    pub model: String,
    pub tone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub state: String,
    pub content: String,
    pub created_at: i64,
    pub meta: MessageMeta,
    pub sort_order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub status: String,
    pub state: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub repository_id: Option<String>,
    pub messages: Vec<Message>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateConversationInput {
    pub title: String,
    pub repository_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateConversationInput {
    pub title: Option<String>,
    pub summary: Option<String>,
    pub status: Option<String>,
    pub state: Option<String>,
    pub repository_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddMessageInput {
    pub id: String,
    pub role: String,
    pub state: String,
    pub content: String,
    pub created_at: i64,
    pub provider: String,
    pub model: String,
    pub tone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMessageInput {
    pub content: Option<String>,
    pub state: Option<String>,
}

// Repository types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Repository {
    pub id: String,
    pub name: String,
    pub path: String,
    pub branch: String,
    pub tech: Vec<String>,
    pub status: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRepositoryInput {
    pub name: String,
    pub path: String,
    pub branch: Option<String>,
    pub tech: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateRepositoryInput {
    pub name: Option<String>,
    pub branch: Option<String>,
    pub tech: Option<Vec<String>>,
    pub status: Option<String>,
}
