"""
Scikit-learn based Skill Feedback Analyzer for GerontoVoice
Analyzes caregiver conversations for empathy, active listening, and communication skills
"""

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split
import joblib
import json
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SkillScore:
    """Individual skill score with metadata"""
    skill_name: str
    score: float
    confidence: float
    feedback: str
    improvement_suggestions: List[str]
    timestamp: datetime

@dataclass
class ConversationAnalysis:
    """Complete analysis of a conversation"""
    session_id: str
    total_score: float
    skill_scores: List[SkillScore]
    conversation_length: int
    analysis_timestamp: datetime
    insights: List[str]

class CaregiverSkillAnalyzer:
    """
    Analyzes caregiver conversations using scikit-learn models
    Provides detailed feedback on empathy, active listening, and communication
    """
    
    def __init__(self):
        self.models = {}
        self.vectorizers = {}
        self.skill_definitions = self._define_skills()
        self.training_data = self._load_sample_training_data()
        self._train_models()
    
    def _define_skills(self) -> Dict[str, Dict]:
        """Define caregiver skills and their characteristics"""
        return {
            "empathy": {
                "description": "Ability to understand and share feelings of elderly person",
                "indicators": [
                    "understanding phrases", "emotional validation", "compassionate language",
                    "acknowledging feelings", "showing care", "being supportive"
                ],
                "positive_keywords": [
                    "understand", "feel", "care", "sorry", "worried", "concerned",
                    "difficult", "challenging", "support", "help", "listen", "here"
                ],
                "negative_keywords": [
                    "should", "must", "have to", "wrong", "bad", "stop", "don't"
                ]
            },
            "active_listening": {
                "description": "Fully concentrating on and responding to elderly person",
                "indicators": [
                    "asking follow-up questions", "reflecting back", "showing attention",
                    "acknowledging responses", "building on responses"
                ],
                "positive_keywords": [
                    "tell me more", "what do you think", "how do you feel", "can you explain",
                    "i hear you", "i understand", "that makes sense", "go on"
                ],
                "negative_keywords": [
                    "interrupting", "changing subject", "ignoring", "dismissing"
                ]
            },
            "clear_communication": {
                "description": "Using simple, clear language appropriate for elderly care",
                "indicators": [
                    "simple vocabulary", "clear instructions", "appropriate pace",
                    "avoiding jargon", "checking understanding"
                ],
                "positive_keywords": [
                    "let me explain", "in simple terms", "do you understand", "clear",
                    "simple", "easy", "step by step", "let's try"
                ],
                "negative_keywords": [
                    "complicated", "difficult", "complex", "medical terms", "jargon"
                ]
            },
            "patience": {
                "description": "Maintaining calm and composure during difficult situations",
                "indicators": [
                    "calm responses", "not rushing", "allowing time", "staying composed",
                    "handling repetition", "managing frustration"
                ],
                "positive_keywords": [
                    "take your time", "no rush", "it's okay", "patient", "calm",
                    "whenever you're ready", "no problem", "that's fine"
                ],
                "negative_keywords": [
                    "hurry", "quickly", "fast", "impatient", "frustrated", "annoyed"
                ]
            }
        }
    
    def _load_sample_training_data(self) -> pd.DataFrame:
        """Load sample training data for skill analysis"""
        import os
        
        # Try to load from conversation CSV first
        csv_paths = [
            'data/conversation_text.csv',
            'backend/data/conversation_text.csv',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'conversation_text.csv'),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'conversation_text.csv')
        ]
        
        for csv_path in csv_paths:
            try:
                if os.path.exists(csv_path):
                    df = pd.read_csv(csv_path)
                    # Filter for user messages only (caregiver responses)
                    user_messages = df[df['speaker'] == 'user'].copy()
                    if len(user_messages) > 0:
                        logger.info(f"Loaded {len(user_messages)} training samples from {csv_path}")
                        return user_messages
            except Exception as e:
                logger.warning(f"Failed to load conversation data from {csv_path}: {e}")
                continue
        
        # Fallback to synthetic data
        logger.info("Using synthetic training data")
        sample_data = {
            "text": [
                "I understand how difficult this must be for you. Let me help you with that.",
                "Have you taken your medication today? It's important for your health.",
                "Tell me more about how you're feeling. I'm here to listen.",
                "Let me explain this in simple terms so you can understand.",
                "Take your time, there's no rush. I'm here to support you.",
                "You should stop worrying about things you can't control.",
                "Hurry up and take your medicine, we don't have all day.",
                "I don't have time for this right now, figure it out yourself.",
                "That's wrong, you need to do it this way instead.",
                "Stop complaining and just do what I tell you."
            ],
            "empathy_score": [4, 3, 4, 3, 4, 1, 1, 1, 1, 1],
            "active_listening_score": [4, 2, 4, 3, 3, 1, 1, 1, 1, 1],
            "clear_communication_score": [3, 3, 3, 4, 3, 2, 1, 1, 2, 1],
            "patience_score": [4, 3, 4, 3, 4, 2, 1, 1, 1, 1]
        }
        
        # Generate more synthetic training data
        synthetic_data = self._generate_synthetic_training_data()
        
        # Combine real and synthetic data
        all_data = {key: sample_data[key] + synthetic_data[key] for key in sample_data.keys()}
        
        return pd.DataFrame(all_data)
    
    def _generate_synthetic_training_data(self) -> Dict:
        """Generate additional synthetic training data"""
        synthetic_texts = []
        empathy_scores = []
        listening_scores = []
        communication_scores = []
        patience_scores = []
        
        # High-quality caregiver responses
        high_quality_responses = [
            "I can see this is really hard for you. How can I help make it easier?",
            "You're doing great. Tell me what's on your mind.",
            "I'm here for you. What would help you feel better?",
            "That sounds really challenging. I understand why you'd feel that way.",
            "You're not alone in this. We'll work through it together.",
            "Take all the time you need. I'm not going anywhere.",
            "I care about how you're feeling. Please share what's bothering you.",
            "You're handling this so well. I'm proud of you.",
            "Let's break this down into simple steps.",
            "I want to make sure you understand. Can you tell me what you heard?"
        ]
        
        for response in high_quality_responses:
            synthetic_texts.append(response)
            empathy_scores.append(np.random.randint(3, 5))
            listening_scores.append(np.random.randint(3, 5))
            communication_scores.append(np.random.randint(3, 5))
            patience_scores.append(np.random.randint(3, 5))
        
        # Medium-quality responses
        medium_quality_responses = [
            "Okay, let's try this approach.",
            "I understand. What would you like to do?",
            "That's a good point. Let me think about it.",
            "I can help you with that.",
            "Let's see what we can do.",
            "I hear what you're saying.",
            "That makes sense to me.",
            "I'll help you figure this out.",
            "Let's work on this together.",
            "I'm here to help."
        ]
        
        for response in medium_quality_responses:
            synthetic_texts.append(response)
            empathy_scores.append(np.random.randint(2, 4))
            listening_scores.append(np.random.randint(2, 4))
            communication_scores.append(np.random.randint(2, 4))
            patience_scores.append(np.random.randint(2, 4))
        
        # Low-quality responses
        low_quality_responses = [
            "You need to do what I say.",
            "This is taking too long.",
            "I don't have time for this.",
            "You're being difficult.",
            "Just do it already.",
            "I'm busy right now.",
            "Figure it out yourself.",
            "That's not my problem.",
            "You're wrong about that.",
            "Stop being so stubborn."
        ]
        
        for response in low_quality_responses:
            synthetic_texts.append(response)
            empathy_scores.append(np.random.randint(1, 3))
            listening_scores.append(np.random.randint(1, 3))
            communication_scores.append(np.random.randint(1, 3))
            patience_scores.append(np.random.randint(1, 3))
        
        return {
            "text": synthetic_texts,
            "empathy_score": empathy_scores,
            "active_listening_score": listening_scores,
            "clear_communication_score": communication_scores,
            "patience_score": patience_scores
        }
    
    def _train_models(self):
        """Train scikit-learn models for each skill"""
        try:
            for skill in self.skill_definitions.keys():
                logger.info(f"Training model for {skill}")
                
                # Prepare training data
                X = self.training_data['text']
                y = self.training_data[f'{skill}_score']
                
                # Vectorize text
                vectorizer = TfidfVectorizer(
                    max_features=1000,
                    stop_words='english',
                    ngram_range=(1, 2)
                )
                X_vectorized = vectorizer.fit_transform(X)
                
                # Train model
                model = RandomForestClassifier(
                    n_estimators=100,
                    random_state=42,
                    max_depth=10
                )
                model.fit(X_vectorized, y)
                
                # Store model and vectorizer
                self.models[skill] = model
                self.vectorizers[skill] = vectorizer
                
                logger.info(f"Model trained for {skill} with accuracy: {model.score(X_vectorized, y):.3f}")
                
        except Exception as e:
            logger.error(f"Error training models: {e}")
    
    def analyze_conversation(self, 
                           conversation_data: List[Dict], 
                           session_id: str) -> ConversationAnalysis:
        """
        Analyze a complete conversation for caregiver skills
        
        Args:
            conversation_data: List of conversation entries
            session_id: Unique session identifier
            
        Returns:
            ConversationAnalysis with detailed skill scores
        """
        try:
            # Extract user messages
            user_messages = [
                entry['text'] for entry in conversation_data 
                if entry.get('speaker') == 'user'
            ]
            
            # Combine all user messages
            full_text = ' '.join(user_messages)
            
            # Analyze each skill
            skill_scores = []
            total_score = 0
            
            for skill_name in self.skill_definitions.keys():
                score_data = self._analyze_skill(full_text, skill_name)
                skill_scores.append(score_data)
                total_score += score_data.score
            
            # Calculate average score
            average_score = total_score / len(skill_scores) if skill_scores else 0
            
            # Generate insights
            insights = self._generate_insights(skill_scores, conversation_data)
            
            return ConversationAnalysis(
                session_id=session_id,
                total_score=average_score,
                skill_scores=skill_scores,
                conversation_length=len(user_messages),
                analysis_timestamp=datetime.now(),
                insights=insights
            )
            
        except Exception as e:
            logger.error(f"Error analyzing conversation: {e}")
            return ConversationAnalysis(
                session_id=session_id,
                total_score=0,
                skill_scores=[],
                conversation_length=0,
                analysis_timestamp=datetime.now(),
                insights=["Analysis error occurred"]
            )
    
    def _analyze_skill(self, text: str, skill_name: str) -> SkillScore:
        """Analyze individual skill from text"""
        try:
            # Get model and vectorizer
            model = self.models.get(skill_name)
            vectorizer = self.vectorizers.get(skill_name)
            
            if not model or not vectorizer:
                # Fallback to keyword-based analysis
                return self._keyword_based_analysis(text, skill_name)
            
            # Vectorize text
            text_vectorized = vectorizer.transform([text])
            
            # Predict score
            predicted_score = model.predict(text_vectorized)[0]
            confidence = max(model.predict_proba(text_vectorized)[0])
            
            # Generate feedback
            feedback = self._generate_skill_feedback(skill_name, predicted_score, text)
            suggestions = self._generate_improvement_suggestions(skill_name, predicted_score)
            
            # Map skill names to proper titles
            skill_name_mapping = {
                'empathy': 'Empathy',
                'active_listening': 'Active Listening',
                'clear_communication': 'Clear Communication',
                'patience': 'Patience'
            }
            
            return SkillScore(
                skill_name=skill_name_mapping.get(skill_name, skill_name.replace('_', ' ').title()),
                score=float(predicted_score),
                confidence=float(confidence),
                feedback=feedback,
                improvement_suggestions=suggestions,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error analyzing skill {skill_name}: {e}")
            # Map skill names to proper titles
            skill_name_mapping = {
                'empathy': 'Empathy',
                'active_listening': 'Active Listening',
                'clear_communication': 'Clear Communication',
                'patience': 'Patience'
            }
            return SkillScore(
                skill_name=skill_name_mapping.get(skill_name, skill_name.replace('_', ' ').title()),
                score=2.0,
                confidence=0.5,
                feedback=f"Analysis error for {skill_name}",
                improvement_suggestions=["Unable to analyze this skill"],
                timestamp=datetime.now()
            )
    
    def _keyword_based_analysis(self, text: str, skill_name: str) -> SkillScore:
        """Fallback keyword-based analysis"""
        skill_def = self.skill_definitions[skill_name]
        text_lower = text.lower()
        
        # Count positive and negative keywords
        positive_count = sum(1 for keyword in skill_def['positive_keywords'] if keyword in text_lower)
        negative_count = sum(1 for keyword in skill_def['negative_keywords'] if keyword in text_lower)
        
        # Calculate score (1-4 scale)
        if positive_count > negative_count:
            score = min(3 + (positive_count - negative_count) * 0.5, 4)
        elif negative_count > positive_count:
            score = max(1 - (negative_count - positive_count) * 0.5, 1)
        else:
            score = 2.5
        
        # Generate feedback
        feedback = self._generate_skill_feedback(skill_name, score, text)
        suggestions = self._generate_improvement_suggestions(skill_name, score)
        
        # Map skill names to proper titles
        skill_name_mapping = {
            'empathy': 'Empathy',
            'active_listening': 'Active Listening',
            'clear_communication': 'Clear Communication',
            'patience': 'Patience'
        }
        
        return SkillScore(
            skill_name=skill_name_mapping.get(skill_name, skill_name.replace('_', ' ').title()),
            score=float(score),
            confidence=0.7,
            feedback=feedback,
            improvement_suggestions=suggestions,
            timestamp=datetime.now()
        )
    
    def _generate_skill_feedback(self, skill_name: str, score: float, text: str) -> str:
        """Generate enhanced personalized feedback for skill with specific examples"""
        feedback_templates = {
            "empathy": {
                4: "Excellent empathy! Your responses show genuine care and understanding. You're acknowledging feelings and providing emotional support.",
                3: "Good empathy! You're showing care and concern for the elderly person. Try to acknowledge their emotions more explicitly.",
                2: "Some empathy shown, but try phrases like 'I understand how you feel' and 'That must be difficult for you'.",
                1: "Limited empathy detected. Practice acknowledging feelings and avoid dismissive language like 'don't worry about it'."
            },
            "active_listening": {
                4: "Outstanding active listening! You're fully engaged, asking thoughtful questions, and reflecting back what you hear.",
                3: "Good listening skills! You're paying attention and responding appropriately. Try more 'how' and 'what' questions.",
                2: "Some listening skills shown, but try open-ended questions like 'Tell me more about that' and 'How do you feel?'",
                1: "Limited active listening. Focus on asking questions and avoid interrupting or changing subjects."
            },
            "clear_communication": {
                4: "Excellent communication! You're using clear, simple language effectively and checking for understanding.",
                3: "Good communication! Your language is clear and appropriate. Try using even simpler vocabulary when possible.",
                2: "Communication could be clearer. Break complex information into smaller steps and ask 'Does this make sense?' more often.",
                1: "Communication needs improvement. Use everyday words instead of medical terms and check understanding frequently."
            },
            "patience": {
                4: "Excellent patience! You're staying calm, allowing adequate time, and using phrases like 'take your time'.",
                3: "Good patience! You're maintaining composure during the conversation. Try 'There's no rush' more often.",
                2: "Some patience shown, but try phrases like 'Take your time, there's no rush' and allow longer pauses.",
                1: "Limited patience detected. Avoid showing frustration and practice staying calm during repetitive questions."
            }
        }
        
        score_key = min(4, max(1, int(round(score))))
        return feedback_templates.get(skill_name, {}).get(score_key, "Skill analysis completed.")
    
    def _generate_improvement_suggestions(self, skill_name: str, score: float) -> List[str]:
        """Generate improvement suggestions for skill"""
        suggestions_map = {
            "empathy": [
                "Use phrases like 'I understand how you feel'",
                "Acknowledge the person's emotions",
                "Show genuine care and concern",
                "Validate their experiences and feelings"
            ],
            "active_listening": [
                "Ask follow-up questions like 'Tell me more about that'",
                "Reflect back what you heard",
                "Show you're paying attention",
                "Build on their responses"
            ],
            "clear_communication": [
                "Use simple, everyday words",
                "Break down complex instructions",
                "Check if they understand",
                "Speak slowly and clearly"
            ],
            "patience": [
                "Allow time for responses",
                "Don't rush the conversation",
                "Stay calm during difficult moments",
                "Use phrases like 'Take your time'"
            ]
        }
        
        if score < 3:
            return suggestions_map.get(skill_name, ["Continue practicing this skill"])
        else:
            return ["Keep up the great work!", "Continue with your current approach"]
    
    def _generate_insights(self, skill_scores: List[SkillScore], conversation_data: List[Dict]) -> List[str]:
        """Generate overall insights from analysis"""
        insights = []
        
        # Overall performance insight
        avg_score = sum(score.score for score in skill_scores) / len(skill_scores) if skill_scores else 0
        if avg_score >= 3.5:
            insights.append("Excellent overall performance! You're demonstrating strong caregiver skills.")
        elif avg_score >= 2.5:
            insights.append("Good performance! You're showing solid caregiver skills with room for improvement.")
        else:
            insights.append("There's room for improvement. Focus on empathy and active listening.")
        
        # Conversation length insight
        user_messages = [entry for entry in conversation_data if entry.get('speaker') == 'user']
        if len(user_messages) >= 10:
            insights.append("Great conversation length! You're engaging in meaningful dialogue.")
        elif len(user_messages) >= 5:
            insights.append("Good conversation length. Try to engage a bit more for better practice.")
        else:
            insights.append("Consider having longer conversations for more practice opportunities.")
        
        # Specific skill insights
        for score in skill_scores:
            if score.score >= 3.5:
                insights.append(f"Outstanding {score.skill_name.lower()}! Keep up the excellent work.")
            elif score.score <= 2:
                insights.append(f"Focus on improving {score.skill_name.lower()} in your next session.")
        
        return insights
    
    def generate_progress_chart(self, 
                              session_analyses: List[ConversationAnalysis]) -> Dict:
        """Generate progress visualization data"""
        try:
            if not session_analyses:
                return {"error": "No session data available"}
            
            # Prepare data for visualization
            sessions = []
            empathy_scores = []
            listening_scores = []
            communication_scores = []
            patience_scores = []
            total_scores = []
            
            for analysis in session_analyses:
                sessions.append(analysis.session_id)
                total_scores.append(analysis.total_score)
                
                # Extract individual skill scores
                skill_dict = {score.skill_name.lower().replace(' ', '_'): score.score 
                             for score in analysis.skill_scores}
                
                empathy_scores.append(skill_dict.get('empathy', 0))
                listening_scores.append(skill_dict.get('active_listening', 0))
                communication_scores.append(skill_dict.get('clear_communication', 0))
                patience_scores.append(skill_dict.get('patience', 0))
            
            # Create Plotly chart data
            chart_data = {
                "sessions": sessions,
                "total_scores": total_scores,
                "skill_scores": {
                    "empathy": empathy_scores,
                    "active_listening": listening_scores,
                    "clear_communication": communication_scores,
                    "patience": patience_scores
                },
                "chart_html": self._create_plotly_chart(sessions, total_scores, skill_scores)
            }
            
            return chart_data
            
        except Exception as e:
            logger.error(f"Error generating progress chart: {e}")
            return {"error": str(e)}
    
    def _create_plotly_chart(self, sessions: List[str], total_scores: List[float], 
                            skill_scores: Dict[str, List[float]]) -> str:
        """Create Plotly chart HTML"""
        try:
            fig = make_subplots(
                rows=2, cols=1,
                subplot_titles=('Overall Progress', 'Skill Breakdown'),
                vertical_spacing=0.1
            )
            
            # Overall progress line
            fig.add_trace(
                go.Scatter(
                    x=sessions,
                    y=total_scores,
                    mode='lines+markers',
                    name='Total Score',
                    line=dict(color='blue', width=3),
                    marker=dict(size=8)
                ),
                row=1, col=1
            )
            
            # Skill breakdown
            colors = ['red', 'green', 'orange', 'purple']
            skill_names = ['empathy', 'active_listening', 'clear_communication', 'patience']
            
            for i, skill in enumerate(skill_names):
                fig.add_trace(
                    go.Scatter(
                        x=sessions,
                        y=skill_scores[skill],
                        mode='lines+markers',
                        name=skill.replace('_', ' ').title(),
                        line=dict(color=colors[i], width=2),
                        marker=dict(size=6)
                    ),
                    row=2, col=1
                )
            
            fig.update_layout(
                title='Caregiver Skill Progress Over Time',
                height=600,
                showlegend=True
            )
            
            return fig.to_html(include_plotlyjs='cdn')
            
        except Exception as e:
            logger.error(f"Error creating chart: {e}")
            return "<p>Chart generation failed</p>"

# Example usage and testing
if __name__ == "__main__":
    analyzer = CaregiverSkillAnalyzer()
    
    # Test conversation analysis
    test_conversation = [
        {"speaker": "user", "text": "I understand how difficult this must be for you. How are you feeling today?"},
        {"speaker": "user", "text": "Tell me more about what's worrying you. I'm here to listen."},
        {"speaker": "user", "text": "Let me explain this in simple terms so you can understand."},
        {"speaker": "user", "text": "Take your time, there's no rush. I'm here to support you."}
    ]
    
    analysis = analyzer.analyze_conversation(test_conversation, "test_session_1")
    
    print(f"Total Score: {analysis.total_score:.2f}")
    print(f"Conversation Length: {analysis.conversation_length}")
    print("\nSkill Scores:")
    for score in analysis.skill_scores:
        print(f"{score.skill_name}: {score.score:.2f} - {score.feedback}")
    
    print("\nInsights:")
    for insight in analysis.insights:
        print(f"- {insight}")
