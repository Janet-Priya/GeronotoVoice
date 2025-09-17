"""
Tests for GerontoVoice Database
"""

import pytest
import tempfile
import os
import json
from datetime import datetime, timedelta
import sys

# Add backend modules to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db import GerontoVoiceDatabase, User, Session, SkillProgress

class TestGerontoVoiceDatabase:
    """Test cases for database functionality"""
    
    def setup_method(self):
        """Set up test database"""
        # Create temporary database file
        self.temp_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        self.temp_db.close()
        self.db = GerontoVoiceDatabase(self.temp_db.name)
    
    def teardown_method(self):
        """Clean up test database"""
        if os.path.exists(self.temp_db.name):
            os.unlink(self.temp_db.name)
    
    def test_database_initialization(self):
        """Test database initializes correctly"""
        assert os.path.exists(self.temp_db.name)
        
        # Check tables exist
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            assert 'users' in tables
            assert 'sessions' in tables
            assert 'skill_progress' in tables
            assert 'achievements' in tables
    
    def test_user_creation(self):
        """Test user creation"""
        user = self.db.create_user("test_user_1", "Test User", "test@example.com")
        
        assert user.user_id == "test_user_1"
        assert user.name == "Test User"
        assert user.email == "test@example.com"
        assert user.total_sessions == 0
        assert user.average_score == 0.0
    
    def test_user_retrieval(self):
        """Test user retrieval"""
        # Create user
        self.db.create_user("test_user_2", "Test User 2", "test2@example.com")
        
        # Retrieve user
        user = self.db.get_user("test_user_2")
        
        assert user is not None
        assert user.user_id == "test_user_2"
        assert user.name == "Test User 2"
        assert user.email == "test2@example.com"
    
    def test_user_not_found(self):
        """Test user not found handling"""
        user = self.db.get_user("nonexistent_user")
        assert user is None
    
    def test_user_activity_update(self):
        """Test user activity update"""
        # Create user
        self.db.create_user("test_user_3", "Test User 3")
        
        # Update activity
        self.db.update_user_activity("test_user_3")
        
        # Check activity was updated
        user = self.db.get_user("test_user_3")
        assert user.last_active is not None
    
    def test_session_creation(self):
        """Test session creation"""
        # Create user first
        self.db.create_user("test_user_4", "Test User 4")
        
        # Create session
        session = self.db.create_session("session_1", "test_user_4", "margaret")
        
        assert session.session_id == "session_1"
        assert session.user_id == "test_user_4"
        assert session.persona_id == "margaret"
        assert session.status == "active"
        assert session.conversation_data == []
        assert session.skill_scores == {}
    
    def test_session_conversation_update(self):
        """Test session conversation update"""
        # Create user and session
        self.db.create_user("test_user_5", "Test User 5")
        self.db.create_session("session_2", "test_user_5", "robert")
        
        # Update conversation
        conversation_data = [
            {"speaker": "user", "text": "Hello Robert", "timestamp": datetime.now().isoformat()},
            {"speaker": "ai", "text": "Hello there", "timestamp": datetime.now().isoformat()}
        ]
        
        self.db.update_session_conversation("session_2", conversation_data)
        
        # Verify update
        sessions = self.db.get_user_sessions("test_user_5")
        assert len(sessions) == 1
        assert len(sessions[0].conversation_data) == 2
    
    def test_session_completion(self):
        """Test session completion"""
        # Create user and session
        self.db.create_user("test_user_6", "Test User 6")
        self.db.create_session("session_3", "test_user_6", "eleanor")
        
        # Complete session
        skill_scores = {"empathy": 4.0, "active_listening": 3.5, "clear_communication": 4.0, "patience": 3.8}
        self.db.complete_session("session_3", skill_scores, 3.8)
        
        # Verify completion
        sessions = self.db.get_user_sessions("test_user_6")
        assert len(sessions) == 1
        assert sessions[0].status == "completed"
        assert sessions[0].total_score == 3.8
        assert sessions[0].skill_scores == skill_scores
        
        # Check user stats updated
        user = self.db.get_user("test_user_6")
        assert user.total_sessions == 1
        assert user.average_score == 3.8
    
    def test_skill_progress_update(self):
        """Test skill progress tracking"""
        # Create user
        self.db.create_user("test_user_7", "Test User 7")
        
        # Update skill progress
        self.db.update_skill_progress("test_user_7", "empathy", 4.0)
        
        # Check progress
        progress = self.db.get_skill_progress("test_user_7")
        assert len(progress) == 1
        assert progress[0].skill_name == "empathy"
        assert progress[0].current_score == 4.0
        assert progress[0].sessions_practiced == 1
    
    def test_skill_progress_improvement(self):
        """Test skill progress improvement tracking"""
        # Create user
        self.db.create_user("test_user_8", "Test User 8")
        
        # Initial skill progress
        self.db.update_skill_progress("test_user_8", "empathy", 3.0)
        
        # Improved skill progress
        self.db.update_skill_progress("test_user_8", "empathy", 4.0)
        
        # Check improvement
        progress = self.db.get_skill_progress("test_user_8")
        assert len(progress) == 1
        assert progress[0].current_score == 4.0
        assert progress[0].improvement_trend == 1.0  # 4.0 - 3.0
        assert progress[0].sessions_practiced == 2
    
    def test_achievement_unlock(self):
        """Test achievement unlocking"""
        # Create user
        self.db.create_user("test_user_9", "Test User 9")
        
        # Unlock achievement
        self.db.unlock_achievement("test_user_9", "first_session", "First Steps", "Complete your first training session")
        
        # Check achievement
        achievements = self.db.get_user_achievements("test_user_9")
        assert len(achievements) == 1
        assert achievements[0]["achievement_id"] == "first_session"
        assert achievements[0]["achievement_name"] == "First Steps"
    
    def test_achievement_duplicate_prevention(self):
        """Test achievement duplicate prevention"""
        # Create user
        self.db.create_user("test_user_10", "Test User 10")
        
        # Unlock same achievement twice
        self.db.unlock_achievement("test_user_10", "first_session", "First Steps", "Complete your first training session")
        self.db.unlock_achievement("test_user_10", "first_session", "First Steps", "Complete your first training session")
        
        # Should only have one achievement
        achievements = self.db.get_user_achievements("test_user_10")
        assert len(achievements) == 1
    
    def test_user_sessions_retrieval(self):
        """Test user sessions retrieval"""
        # Create user
        self.db.create_user("test_user_11", "Test User 11")
        
        # Create multiple sessions
        self.db.create_session("session_4", "test_user_11", "margaret")
        self.db.create_session("session_5", "test_user_11", "robert")
        
        # Retrieve sessions
        sessions = self.db.get_user_sessions("test_user_11")
        assert len(sessions) == 2
        assert sessions[0].session_id == "session_5"  # Most recent first
        assert sessions[1].session_id == "session_4"
    
    def test_user_data_export(self):
        """Test user data export"""
        # Create user with data
        self.db.create_user("test_user_12", "Test User 12", "test12@example.com")
        
        # Create and complete session
        self.db.create_session("session_6", "test_user_12", "margaret")
        skill_scores = {"empathy": 4.0, "active_listening": 3.5}
        self.db.complete_session("session_6", skill_scores, 3.75)
        
        # Update skill progress
        self.db.update_skill_progress("test_user_12", "empathy", 4.0)
        
        # Unlock achievement
        self.db.unlock_achievement("test_user_12", "first_session", "First Steps", "Complete your first training session")
        
        # Export data
        export_data = self.db.export_user_data("test_user_12")
        
        assert "user" in export_data
        assert "sessions" in export_data
        assert "skill_progress" in export_data
        assert "achievements" in export_data
        assert export_data["total_sessions"] == 1
        assert export_data["average_score"] == 3.75
    
    def test_user_statistics(self):
        """Test user statistics generation"""
        # Create user with data
        self.db.create_user("test_user_13", "Test User 13")
        
        # Create and complete multiple sessions
        for i in range(3):
            session_id = f"session_{i+7}"
            self.db.create_session(session_id, "test_user_13", "margaret")
            skill_scores = {"empathy": 3.0 + i * 0.5, "active_listening": 3.5 + i * 0.3}
            self.db.complete_session(session_id, skill_scores, 3.25 + i * 0.4)
        
        # Get statistics
        stats = self.db.get_user_statistics("test_user_13")
        
        assert "user_info" in stats
        assert "session_stats" in stats
        assert "skill_stats" in stats
        assert "achievements" in stats
        assert stats["session_stats"]["total_sessions"] == 3
        assert stats["session_stats"]["completed_sessions"] == 3
    
    def test_nonexistent_user_statistics(self):
        """Test statistics for nonexistent user"""
        stats = self.db.get_user_statistics("nonexistent_user")
        assert "error" in stats
        assert stats["error"] == "User not found"

if __name__ == "__main__":
    pytest.main([__file__])
