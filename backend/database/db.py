"""
SQLite Database Management for GerontoVoice
Handles session storage, user progress tracking, and data export
"""

import sqlite3
import json
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import os
import pandas as pd
from contextlib import contextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class User:
    """User data structure"""
    user_id: str
    name: str
    email: Optional[str] = None
    created_at: datetime = None
    last_active: datetime = None
    total_sessions: int = 0
    average_score: float = 0.0

@dataclass
class Session:
    """Training session data structure"""
    session_id: str
    user_id: str
    persona_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    conversation_data: List[Dict] = None
    skill_scores: Dict[str, float] = None
    total_score: float = 0.0
    status: str = "active"  # active, completed, abandoned

@dataclass
class SkillProgress:
    """Individual skill progress tracking"""
    user_id: str
    skill_name: str
    current_score: float
    improvement_trend: float
    sessions_practiced: int
    last_updated: datetime

class GerontoVoiceDatabase:
    """
    SQLite database manager for GerontoVoice
    Handles all data persistence and retrieval operations
    """
    
    def __init__(self, db_path: str = "geronto_voice.db"):
        self.db_path = db_path
        self._initialize_database()
    
    def _initialize_database(self):
        """Initialize database tables"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Users table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        user_id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        email TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        total_sessions INTEGER DEFAULT 0,
                        average_score REAL DEFAULT 0.0
                    )
                """)
                
                # Sessions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        session_id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        persona_id TEXT NOT NULL,
                        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        end_time TIMESTAMP,
                        conversation_data TEXT,  -- JSON string
                        skill_scores TEXT,       -- JSON string
                        total_score REAL DEFAULT 0.0,
                        status TEXT DEFAULT 'active',
                        FOREIGN KEY (user_id) REFERENCES users (user_id)
                    )
                """)
                
                # Skill progress table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS skill_progress (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        skill_name TEXT NOT NULL,
                        current_score REAL NOT NULL,
                        improvement_trend REAL DEFAULT 0.0,
                        sessions_practiced INTEGER DEFAULT 1,
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (user_id),
                        UNIQUE(user_id, skill_name)
                    )
                """)
                
                # Achievements table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS achievements (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        achievement_id TEXT NOT NULL,
                        achievement_name TEXT NOT NULL,
                        description TEXT,
                        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        progress INTEGER DEFAULT 0,
                        FOREIGN KEY (user_id) REFERENCES users (user_id)
                    )
                """)
                
                # Create indexes for better performance
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions (start_time)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_skill_progress_user_id ON skill_progress (user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements (user_id)")
                
                conn.commit()
                logger.info("Database initialized successfully")
                
        except Exception as e:
            logger.error(f"Error initializing database: {e}")
            raise
    
    @contextmanager
    def _get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        try:
            yield conn
        finally:
            conn.close()
    
    # User Management
    def create_user(self, user_id: str, name: str, email: str = None) -> User:
        """Create a new user"""
        try:
            user = User(
                user_id=user_id,
                name=name,
                email=email,
                created_at=datetime.now(),
                last_active=datetime.now()
            )
            
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO users (user_id, name, email, created_at, last_active)
                    VALUES (?, ?, ?, ?, ?)
                """, (user.user_id, user.name, user.email, user.created_at, user.last_active))
                conn.commit()
            
            logger.info(f"Created user: {user_id}")
            return user
            
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise
    
    def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
                row = cursor.fetchone()
                
                if row:
                    return User(
                        user_id=row['user_id'],
                        name=row['name'],
                        email=row['email'],
                        created_at=datetime.fromisoformat(row['created_at']),
                        last_active=datetime.fromisoformat(row['last_active']),
                        total_sessions=row['total_sessions'],
                        average_score=row['average_score']
                    )
                return None
                
        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return None
    
    def update_user_activity(self, user_id: str):
        """Update user's last active timestamp"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE users 
                    SET last_active = ? 
                    WHERE user_id = ?
                """, (datetime.now(), user_id))
                conn.commit()
                
        except Exception as e:
            logger.error(f"Error updating user activity: {e}")
    
    # Session Management
    def create_session(self, session_id: str, user_id: str, persona_id: str) -> Session:
        """Create a new training session"""
        try:
            session = Session(
                session_id=session_id,
                user_id=user_id,
                persona_id=persona_id,
                start_time=datetime.now(),
                conversation_data=[],
                skill_scores={},
                status="active"
            )
            
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO sessions (session_id, user_id, persona_id, start_time, conversation_data, skill_scores, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    session.session_id,
                    session.user_id,
                    session.persona_id,
                    session.start_time,
                    json.dumps(session.conversation_data),
                    json.dumps(session.skill_scores),
                    session.status
                ))
                conn.commit()
            
            logger.info(f"Created session: {session_id}")
            return session
            
        except Exception as e:
            logger.error(f"Error creating session: {e}")
            raise
    
    def update_session_conversation(self, session_id: str, conversation_data: List[Dict]):
        """Update session with conversation data"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE sessions 
                    SET conversation_data = ? 
                    WHERE session_id = ?
                """, (json.dumps(conversation_data), session_id))
                conn.commit()
                
        except Exception as e:
            logger.error(f"Error updating session conversation: {e}")
    
    def complete_session(self, session_id: str, skill_scores: Dict[str, float], total_score: float):
        """Mark session as completed with final scores"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Update session
                cursor.execute("""
                    UPDATE sessions 
                    SET end_time = ?, skill_scores = ?, total_score = ?, status = 'completed'
                    WHERE session_id = ?
                """, (datetime.now(), json.dumps(skill_scores), total_score, session_id))
                
                # Get user_id for updating user stats
                cursor.execute("SELECT user_id FROM sessions WHERE session_id = ?", (session_id,))
                row = cursor.fetchone()
                if row:
                    user_id = row['user_id']
                    
                    # Update user statistics
                    cursor.execute("""
                        UPDATE users 
                        SET total_sessions = total_sessions + 1,
                            average_score = (
                                SELECT AVG(total_score) 
                                FROM sessions 
                                WHERE user_id = ? AND status = 'completed'
                            )
                        WHERE user_id = ?
                    """, (user_id, user_id))
                
                conn.commit()
                logger.info(f"Completed session: {session_id}")
                
        except Exception as e:
            logger.error(f"Error completing session: {e}")
    
    def get_user_sessions(self, user_id: str, limit: int = 50) -> List[Session]:
        """Get user's training sessions"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM sessions 
                    WHERE user_id = ? 
                    ORDER BY start_time DESC 
                    LIMIT ?
                """, (user_id, limit))
                
                sessions = []
                for row in cursor.fetchall():
                    session = Session(
                        session_id=row['session_id'],
                        user_id=row['user_id'],
                        persona_id=row['persona_id'],
                        start_time=datetime.fromisoformat(row['start_time']),
                        end_time=datetime.fromisoformat(row['end_time']) if row['end_time'] else None,
                        conversation_data=json.loads(row['conversation_data']) if row['conversation_data'] else [],
                        skill_scores=json.loads(row['skill_scores']) if row['skill_scores'] else {},
                        total_score=row['total_score'],
                        status=row['status']
                    )
                    sessions.append(session)
                
                return sessions
                
        except Exception as e:
            logger.error(f"Error getting user sessions: {e}")
            return []
    
    # Skill Progress Tracking
    def update_skill_progress(self, user_id: str, skill_name: str, new_score: float):
        """Update user's skill progress"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Check if skill progress exists
                cursor.execute("""
                    SELECT current_score, sessions_practiced 
                    FROM skill_progress 
                    WHERE user_id = ? AND skill_name = ?
                """, (user_id, skill_name))
                
                row = cursor.fetchone()
                
                if row:
                    # Update existing progress
                    old_score = row['current_score']
                    sessions_practiced = row['sessions_practiced'] + 1
                    improvement_trend = new_score - old_score
                    
                    cursor.execute("""
                        UPDATE skill_progress 
                        SET current_score = ?, improvement_trend = ?, sessions_practiced = ?, last_updated = ?
                        WHERE user_id = ? AND skill_name = ?
                    """, (new_score, improvement_trend, sessions_practiced, datetime.now(), user_id, skill_name))
                else:
                    # Create new skill progress
                    cursor.execute("""
                        INSERT INTO skill_progress (user_id, skill_name, current_score, improvement_trend, sessions_practiced, last_updated)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (user_id, skill_name, new_score, 0.0, 1, datetime.now()))
                
                conn.commit()
                logger.info(f"Updated skill progress for {user_id}: {skill_name}")
                
        except Exception as e:
            logger.error(f"Error updating skill progress: {e}")
    
    def get_skill_progress(self, user_id: str) -> List[SkillProgress]:
        """Get user's skill progress"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM skill_progress 
                    WHERE user_id = ? 
                    ORDER BY last_updated DESC
                """, (user_id,))
                
                progress = []
                for row in cursor.fetchall():
                    skill_progress = SkillProgress(
                        user_id=row['user_id'],
                        skill_name=row['skill_name'],
                        current_score=row['current_score'],
                        improvement_trend=row['improvement_trend'],
                        sessions_practiced=row['sessions_practiced'],
                        last_updated=datetime.fromisoformat(row['last_updated'])
                    )
                    progress.append(skill_progress)
                
                return progress
                
        except Exception as e:
            logger.error(f"Error getting skill progress: {e}")
            return []
    
    # Achievement System
    def unlock_achievement(self, user_id: str, achievement_id: str, achievement_name: str, description: str):
        """Unlock an achievement for a user"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR IGNORE INTO achievements (user_id, achievement_id, achievement_name, description, unlocked_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (user_id, achievement_id, achievement_name, description, datetime.now()))
                conn.commit()
                
                logger.info(f"Unlocked achievement for {user_id}: {achievement_name}")
                
        except Exception as e:
            logger.error(f"Error unlocking achievement: {e}")
    
    def get_user_achievements(self, user_id: str) -> List[Dict]:
        """Get user's achievements"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM achievements 
                    WHERE user_id = ? 
                    ORDER BY unlocked_at DESC
                """, (user_id,))
                
                achievements = []
                for row in cursor.fetchall():
                    achievements.append({
                        'achievement_id': row['achievement_id'],
                        'achievement_name': row['achievement_name'],
                        'description': row['description'],
                        'unlocked_at': row['unlocked_at'],
                        'progress': row['progress']
                    })
                
                return achievements
                
        except Exception as e:
            logger.error(f"Error getting user achievements: {e}")
            return []
    
    # Data Export
    def export_user_data(self, user_id: str) -> Dict:
        """Export all user data to JSON format"""
        try:
            user = self.get_user(user_id)
            if not user:
                return {"error": "User not found"}
            
            sessions = self.get_user_sessions(user_id)
            skill_progress = self.get_skill_progress(user_id)
            achievements = self.get_user_achievements(user_id)
            
            export_data = {
                "user": asdict(user),
                "sessions": [asdict(session) for session in sessions],
                "skill_progress": [asdict(progress) for progress in skill_progress],
                "achievements": achievements,
                "export_timestamp": datetime.now().isoformat(),
                "total_sessions": len(sessions),
                "average_score": sum(session.total_score for session in sessions) / len(sessions) if sessions else 0
            }
            
            return export_data
            
        except Exception as e:
            logger.error(f"Error exporting user data: {e}")
            return {"error": str(e)}
    
    def export_to_csv(self, user_id: str, output_dir: str = "exports"):
        """Export user data to CSV files"""
        try:
            os.makedirs(output_dir, exist_ok=True)
            
            # Export sessions
            sessions = self.get_user_sessions(user_id)
            if sessions:
                sessions_df = pd.DataFrame([asdict(session) for session in sessions])
                sessions_df.to_csv(f"{output_dir}/{user_id}_sessions.csv", index=False)
            
            # Export skill progress
            skill_progress = self.get_skill_progress(user_id)
            if skill_progress:
                progress_df = pd.DataFrame([asdict(progress) for progress in skill_progress])
                progress_df.to_csv(f"{output_dir}/{user_id}_skill_progress.csv", index=False)
            
            logger.info(f"Exported data for user {user_id} to {output_dir}")
            
        except Exception as e:
            logger.error(f"Error exporting to CSV: {e}")
    
    # Analytics and Reporting
    def get_user_statistics(self, user_id: str) -> Dict:
        """Get comprehensive user statistics"""
        try:
            user = self.get_user(user_id)
            if not user:
                return {"error": "User not found"}
            
            sessions = self.get_user_sessions(user_id)
            skill_progress = self.get_skill_progress(user_id)
            achievements = self.get_user_achievements(user_id)
            
            # Calculate statistics
            completed_sessions = [s for s in sessions if s.status == 'completed']
            total_conversation_time = sum(
                (s.end_time - s.start_time).total_seconds() 
                for s in completed_sessions 
                if s.end_time
            )
            
            # Skill trends
            skill_trends = {}
            for progress in skill_progress:
                skill_trends[progress.skill_name] = {
                    'current_score': progress.current_score,
                    'improvement_trend': progress.improvement_trend,
                    'sessions_practiced': progress.sessions_practiced
                }
            
            statistics = {
                "user_info": asdict(user),
                "session_stats": {
                    "total_sessions": len(sessions),
                    "completed_sessions": len(completed_sessions),
                    "average_session_duration": total_conversation_time / len(completed_sessions) if completed_sessions else 0,
                    "average_score": sum(s.total_score for s in completed_sessions) / len(completed_sessions) if completed_sessions else 0
                },
                "skill_stats": skill_trends,
                "achievements": {
                    "total_unlocked": len(achievements),
                    "recent_achievements": achievements[:5]
                },
                "generated_at": datetime.now().isoformat()
            }
            
            return statistics
            
        except Exception as e:
            logger.error(f"Error getting user statistics: {e}")
            return {"error": str(e)}

# Example usage and testing
if __name__ == "__main__":
    db = GerontoVoiceDatabase("test_geronto_voice.db")
    
    # Test user creation
    user = db.create_user("test_user_1", "Test User", "test@example.com")
    print(f"Created user: {user.name}")
    
    # Test session creation
    session = db.create_session("test_session_1", "test_user_1", "margaret")
    print(f"Created session: {session.session_id}")
    
    # Test conversation update
    conversation_data = [
        {"speaker": "user", "text": "Hello Margaret, how are you today?"},
        {"speaker": "ai", "text": "Hello dear, I'm doing well. How are you?"}
    ]
    db.update_session_conversation("test_session_1", conversation_data)
    
    # Test session completion
    skill_scores = {"empathy": 4.0, "active_listening": 3.5, "clear_communication": 4.0, "patience": 3.8}
    db.complete_session("test_session_1", skill_scores, 3.8)
    
    # Test data export
    export_data = db.export_user_data("test_user_1")
    print(f"Export data keys: {list(export_data.keys())}")
    
    # Test statistics
    stats = db.get_user_statistics("test_user_1")
    print(f"User statistics: {stats['session_stats']}")
