#!/usr/bin/env python3
"""
Data Merging Script for GerontoVoice Elder Care Training
Merges conversation_text.csv, conversation_audio.csv, dialogs.txt, and train.csv
into a unified elder care conversation dataset.
"""

import pandas as pd
import numpy as np
import os
import logging
import re
from typing import List, Dict, Any, Tuple
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ElderCareDataMerger:
    """Merge multiple datasets into unified elder care conversation format"""
    
    def __init__(self, data_dir: str = "backend/data", output_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Ensure data directory exists
        if not self.data_dir.exists():
            raise FileNotFoundError(f"Data directory {self.data_dir} not found")
            
        # Persona mapping for elder care contexts
        self.persona_keywords = {
            'dementia': ['confused', 'forget', 'memory', 'remember', 'lost', 'medication', 'margaret'],
            'diabetes': ['sugar', 'blood', 'insulin', 'diet', 'carb', 'glucose', 'robert'],
            'mobility': ['walk', 'fall', 'walker', 'stand', 'move', 'balance', 'eleanor', 'mobility'],
            'general': ['help', 'care', 'support', 'family', 'feel', 'thank']
        }
        
        # Emotion keywords for classification
        self.emotion_keywords = {
            'confused': ['confused', 'unsure', 'lost', 'unclear', 'puzzled'],
            'worried': ['worried', 'anxious', 'concerned', 'afraid', 'scared'],
            'grateful': ['thank', 'grateful', 'appreciate', 'kind', 'wonderful'],
            'sad': ['sad', 'lonely', 'miss', 'upset', 'disappointed'],
            'happy': ['happy', 'good', 'great', 'wonderful', 'pleased'],
            'frustrated': ['frustrated', 'annoyed', 'difficult', 'hard', 'struggle'],
            'neutral': ['okay', 'fine', 'yes', 'no', 'maybe']
        }
        
    def load_conversation_text(self) -> pd.DataFrame:
        """Load and process conversation_text.csv"""
        file_path = self.data_dir / "conversation_text.csv"
        if not file_path.exists():
            logger.warning(f"File {file_path} not found")
            return pd.DataFrame()
            
        try:
            df = pd.read_csv(file_path)
            logger.info(f"Loaded {len(df)} rows from conversation_text.csv")
            
            # Ensure required columns exist
            required_cols = ['speaker', 'text', 'emotion']
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                logger.error(f"Missing columns in conversation_text.csv: {missing_cols}")
                return pd.DataFrame()
            
            # Add source and standardize
            df['source'] = 'conversation_text'
            df['condition'] = df['text'].apply(self._classify_condition)
            
            # Fill missing scores with defaults
            score_cols = ['empathy_score', 'active_listening_score', 'clear_communication_score', 'patience_score']
            for col in score_cols:
                if col not in df.columns:
                    df[col] = 3  # Default score
                else:
                    df[col] = df[col].fillna(3)
                    
            return df
            
        except Exception as e:
            logger.error(f"Error loading conversation_text.csv: {e}")
            return pd.DataFrame()
    
    def load_conversation_audio(self) -> pd.DataFrame:
        """Load and process conversation_audio.csv"""
        file_path = self.data_dir / "conversation_audio.csv"
        if not file_path.exists():
            logger.warning(f"File {file_path} not found")
            return pd.DataFrame()
            
        try:
            df = pd.read_csv(file_path)
            logger.info(f"Loaded {len(df)} rows from conversation_audio.csv")
            
            # Create conversation entries from audio metadata
            conversations = []
            for _, row in df.iterrows():
                # Map human_type to speaker
                speaker = 'caregiver' if row.get('human_type') == 'therapist' else 'elder'
                
                # Generate conversation text based on context
                if speaker == 'caregiver':
                    text_templates = [
                        "How are you feeling today?",
                        "Can you tell me about your concerns?",
                        "I'm here to help you with that.",
                        "Let's work through this together.",
                        "You're doing really well."
                    ]
                else:
                    text_templates = [
                        "I'm doing okay, thank you for asking.",
                        "Sometimes I feel confused about things.",
                        "I appreciate your help and patience.",
                        "That makes me feel better.",
                        "I'm worried about my family."
                    ]
                
                # Select template based on conversation_id
                template_idx = int(row.get('conversation_id', 0)) % len(text_templates)
                text = text_templates[template_idx]
                
                conversations.append({
                    'speaker': speaker,
                    'text': text,
                    'emotion': row.get('emotion', 'neutral'),
                    'condition': self._classify_condition(text),
                    'empathy_score': 3,
                    'active_listening_score': 3,
                    'clear_communication_score': 3,
                    'patience_score': 3,
                    'source': 'conversation_audio'
                })
                
            return pd.DataFrame(conversations)
            
        except Exception as e:
            logger.error(f"Error loading conversation_audio.csv: {e}")
            return pd.DataFrame()
    
    def load_dialogs_txt(self) -> pd.DataFrame:
        """Load and process dialogs.txt"""
        file_path = self.data_dir / "dialogs.txt"
        if not file_path.exists():
            logger.warning(f"File {file_path} not found")
            return pd.DataFrame()
            
        try:
            conversations = []
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            # Process tab-separated dialogues
            for i, line in enumerate(lines):
                line = line.strip()
                if not line:
                    continue
                    
                # Split on tab
                parts = line.split('\t')
                if len(parts) >= 2:
                    question = parts[0].strip()
                    answer = parts[1].strip()
                    
                    # Add question (caregiver)
                    conversations.append({
                        'speaker': 'caregiver',
                        'text': question,
                        'emotion': self._classify_emotion(question),
                        'condition': self._classify_condition(question),
                        'empathy_score': self._calculate_empathy_score(question),
                        'active_listening_score': 3,
                        'clear_communication_score': 4,
                        'patience_score': 3,
                        'source': 'dialogs_txt'
                    })
                    
                    # Add answer (elder)
                    conversations.append({
                        'speaker': 'elder',
                        'text': answer,
                        'emotion': self._classify_emotion(answer),
                        'condition': self._classify_condition(answer),
                        'empathy_score': 3,
                        'active_listening_score': 3,
                        'clear_communication_score': 3,
                        'patience_score': 3,
                        'source': 'dialogs_txt'
                    })
                    
                # Limit to reasonable number for demo
                if len(conversations) >= 200:
                    break
                    
            logger.info(f"Processed {len(conversations)} conversations from dialogs.txt")
            return pd.DataFrame(conversations)
            
        except Exception as e:
            logger.error(f"Error loading dialogs.txt: {e}")
            return pd.DataFrame()
    
    def load_train_csv(self) -> pd.DataFrame:
        """Load and process train.csv (medical QA dataset)"""
        file_path = self.data_dir / "train.csv"
        if not file_path.exists():
            logger.warning(f"File {file_path} not found")
            return pd.DataFrame()
            
        try:
            # Load only first 1000 rows for efficiency
            df = pd.read_csv(file_path, nrows=1000)
            logger.info(f"Loaded {len(df)} rows from train.csv")
            
            conversations = []
            for _, row in df.iterrows():
                question = row.get('Question', '')
                answer = row.get('Answer', '')
                
                if not question or not answer:
                    continue
                    
                # Convert medical QA to elder care context
                if len(question) > 500 or len(answer) > 500:
                    continue  # Skip very long entries
                    
                # Add question (caregiver)
                conversations.append({
                    'speaker': 'caregiver',
                    'text': self._adapt_medical_question(question),
                    'emotion': 'neutral',
                    'condition': self._classify_condition(question),
                    'empathy_score': 3,
                    'active_listening_score': 3,
                    'clear_communication_score': 4,
                    'patience_score': 3,
                    'source': 'train_csv'
                })
                
                # Add answer (elder or medical context)
                conversations.append({
                    'speaker': 'elder',
                    'text': self._adapt_medical_answer(answer),
                    'emotion': 'neutral',
                    'condition': self._classify_condition(answer),
                    'empathy_score': 3,
                    'active_listening_score': 3,
                    'clear_communication_score': 3,
                    'patience_score': 3,
                    'source': 'train_csv'
                })
                
                # Limit entries
                if len(conversations) >= 400:
                    break
                    
            logger.info(f"Processed {len(conversations)} conversations from train.csv")
            return pd.DataFrame(conversations)
            
        except Exception as e:
            logger.error(f"Error loading train.csv: {e}")
            return pd.DataFrame()
    
    def _classify_condition(self, text: str) -> str:
        """Classify text into medical condition category"""
        text_lower = text.lower()
        
        for condition, keywords in self.persona_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return condition
                    
        return 'general'
    
    def _classify_emotion(self, text: str) -> str:
        """Classify emotion based on text content"""
        text_lower = text.lower()
        
        for emotion, keywords in self.emotion_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return emotion
                    
        return 'neutral'
    
    def _calculate_empathy_score(self, text: str) -> int:
        """Calculate empathy score based on text content"""
        text_lower = text.lower()
        empathy_indicators = ['understand', 'feel', 'sorry', 'care', 'help', 'support']
        
        score = 2  # Base score
        for indicator in empathy_indicators:
            if indicator in text_lower:
                score += 1
                
        return min(score, 5)  # Cap at 5
    
    def _adapt_medical_question(self, question: str) -> str:
        """Adapt medical questions to elder care context"""
        # Simplify and make more conversational
        question = question.replace('?', '').strip()
        
        # Add conversational starters
        starters = [
            "Can you tell me about",
            "I'd like to understand",
            "Help me learn about",
            "Could you explain"
        ]
        
        starter = np.random.choice(starters)
        return f"{starter} {question.lower()}?"
    
    def _adapt_medical_answer(self, answer: str) -> str:
        """Adapt medical answers to elder perspective"""
        # Shorten and simplify
        sentences = answer.split('.')[:2]  # Take first 2 sentences
        simplified = '. '.join(sentences)
        
        if len(simplified) > 200:
            simplified = simplified[:200] + "..."
            
        return simplified
    
    def add_synthetic_elder_conversations(self) -> pd.DataFrame:
        """Add synthetic elder care conversations for each persona"""
        synthetic_conversations = []
        
        # Margaret (Dementia) conversations
        margaret_convos = [
            ("How are you feeling today, Margaret?", "caregiver", "neutral", "general"),
            ("I'm a bit confused today. Where did I put my glasses?", "elder", "confused", "dementia"),
            ("Let me help you find them. They're right here on the table.", "caregiver", "helpful", "general"),
            ("Oh thank you! I get so worried when I can't find things.", "elder", "grateful", "dementia"),
            ("It's completely normal to feel that way. You're doing just fine.", "caregiver", "empathy", "general"),
            
            ("Have you taken your medication this morning?", "caregiver", "neutral", "general"),
            ("I think so... or was that yesterday? I can't remember.", "elder", "confused", "dementia"),
            ("That's okay. Let's check your pill organizer together.", "caregiver", "patient", "general"),
            ("You're so kind to help me. I feel lost sometimes.", "elder", "grateful", "dementia"),
            ("You're not lost. I'm here to help you every step of the way.", "caregiver", "supportive", "general"),
        ]
        
        # Robert (Diabetes) conversations  
        robert_convos = [
            ("Robert, how have your blood sugar levels been?", "caregiver", "neutral", "general"),
            ("They've been running high lately. I checked and it was 190 this morning.", "elder", "worried", "diabetes"),
            ("That is concerning. Have you been following your meal plan?", "caregiver", "empathy", "general"),
            ("I try to, but I sometimes forget to count the carbs.", "elder", "frustrated", "diabetes"),
            ("Let's work together to make a simpler tracking system.", "caregiver", "helpful", "general"),
            
            ("Did you remember to check your feet today?", "caregiver", "neutral", "general"),
            ("Yes, but I found a small cut. Should I be worried?", "elder", "concerned", "diabetes"),
            ("Let's take a look and clean it properly together.", "caregiver", "supportive", "general"),
            ("I appreciate you taking care of me like this.", "elder", "grateful", "diabetes"),
            ("Your health is important to me. We'll monitor it closely.", "caregiver", "caring", "general"),
        ]
        
        # Eleanor (Mobility) conversations
        eleanor_convos = [
            ("Eleanor, how has walking been for you today?", "caregiver", "neutral", "general"),
            ("I'm using my walker more. I'm so afraid of falling.", "elder", "worried", "mobility"),
            ("Using your walker is smart. It keeps you safe and independent.", "caregiver", "encouraging", "general"),
            ("I feel like such a burden. I used to be so active.", "elder", "sad", "mobility"),
            ("You're not a burden. You're adapting and that takes strength.", "caregiver", "empathy", "general"),
            
            ("Would you like to try some gentle exercises today?", "caregiver", "neutral", "general"),
            ("I'd like to, but I worry about losing my balance.", "elder", "worried", "mobility"),
            ("We'll go very slowly and I'll be right beside you.", "caregiver", "patient", "general"),
            ("Thank you for being so understanding about my limitations.", "elder", "grateful", "mobility"),
            ("They're not limitations, they're just adaptations.", "caregiver", "supportive", "general"),
        ]
        
        # Process all synthetic conversations
        all_synthetic = margaret_convos + robert_convos + eleanor_convos
        
        for text, speaker, emotion, condition in all_synthetic:
            synthetic_conversations.append({
                'speaker': speaker,
                'text': text,
                'emotion': emotion,
                'condition': condition,
                'empathy_score': self._calculate_empathy_score(text),
                'active_listening_score': 4 if speaker == 'caregiver' else 3,
                'clear_communication_score': 4,
                'patience_score': 4 if emotion == 'patient' else 3,
                'source': 'synthetic_elder_care'
            })
            
        logger.info(f"Generated {len(synthetic_conversations)} synthetic elder care conversations")
        return pd.DataFrame(synthetic_conversations)
    
    def merge_all_datasets(self) -> pd.DataFrame:
        """Merge all datasets into unified format"""
        logger.info("Starting dataset merging process...")
        
        # Load all datasets
        datasets = [
            ("conversation_text", self.load_conversation_text()),
            ("conversation_audio", self.load_conversation_audio()),
            ("dialogs", self.load_dialogs_txt()),
            ("train_csv", self.load_train_csv()),
            ("synthetic", self.add_synthetic_elder_conversations())
        ]
        
        # Combine datasets
        all_dfs = []
        for name, df in datasets:
            if not df.empty:
                logger.info(f"Adding {len(df)} rows from {name}")
                all_dfs.append(df)
            else:
                logger.warning(f"No data from {name}")
        
        if not all_dfs:
            raise ValueError("No datasets loaded successfully")
            
        # Concatenate all dataframes
        merged_df = pd.concat(all_dfs, ignore_index=True)
        logger.info(f"Combined total: {len(merged_df)} rows")
        
        # Standardize columns
        required_columns = [
            'speaker', 'text', 'emotion', 'condition',
            'empathy_score', 'active_listening_score', 
            'clear_communication_score', 'patience_score', 'source'
        ]
        
        for col in required_columns:
            if col not in merged_df.columns:
                merged_df[col] = 'neutral' if col == 'emotion' else 3
        
        # Clean and validate
        merged_df = self.clean_dataset(merged_df)
        
        return merged_df
    
    def clean_dataset(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and validate the merged dataset"""
        logger.info("Cleaning merged dataset...")
        
        initial_rows = len(df)
        
        # Remove rows with missing text
        df = df.dropna(subset=['text'])
        df = df[df['text'].str.strip() != '']
        
        # Remove duplicates based on text content
        df = df.drop_duplicates(subset=['text'], keep='first')
        
        # Fill missing values
        df['emotion'] = df['emotion'].fillna('neutral')
        df['condition'] = df['condition'].fillna('general')
        df['speaker'] = df['speaker'].fillna('elder')
        
        # Standardize speaker names
        df['speaker'] = df['speaker'].replace({
            'user': 'caregiver',
            'ai': 'elder',
            'client': 'elder',
            'therapist': 'caregiver'
        })
        
        # Validate and fix scores
        score_columns = ['empathy_score', 'active_listening_score', 'clear_communication_score', 'patience_score']
        for col in score_columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(3)
            df[col] = df[col].clip(1, 5).astype(int)
        
        # Filter by text length (remove very short or very long texts)
        df = df[(df['text'].str.len() >= 10) & (df['text'].str.len() <= 500)]
        
        final_rows = len(df)
        logger.info(f"Cleaned dataset: {initial_rows} -> {final_rows} rows ({final_rows/initial_rows*100:.1f}% retained)")
        
        return df
    
    def save_merged_dataset(self, df: pd.DataFrame, filename: str = "merged_elder_care.csv"):
        """Save the merged dataset"""
        output_path = self.output_dir / filename
        
        try:
            df.to_csv(output_path, index=False)
            logger.info(f"Saved merged dataset to {output_path}")
            logger.info(f"Final dataset contains {len(df)} conversations")
            
            # Print summary statistics
            self.print_dataset_summary(df)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error saving dataset: {e}")
            raise
    
    def print_dataset_summary(self, df: pd.DataFrame):
        """Print summary statistics of the dataset"""
        logger.info("\n=== DATASET SUMMARY ===")
        logger.info(f"Total conversations: {len(df)}")
        logger.info(f"Speaker distribution:\n{df['speaker'].value_counts()}")
        logger.info(f"Emotion distribution:\n{df['emotion'].value_counts()}")
        logger.info(f"Condition distribution:\n{df['condition'].value_counts()}")
        logger.info(f"Source distribution:\n{df['source'].value_counts()}")
        logger.info("========================\n")

def main():
    """Main function to run the data merging process"""
    try:
        # Initialize merger
        merger = ElderCareDataMerger()
        
        # Merge all datasets
        merged_df = merger.merge_all_datasets()
        
        # Save the result
        output_path = merger.save_merged_dataset(merged_df)
        
        logger.info(f"✅ Data merging completed successfully!")
        logger.info(f"📁 Output file: {output_path}")
        logger.info(f"📊 Total conversations: {len(merged_df)}")
        
        return output_path
        
    except Exception as e:
        logger.error(f"❌ Data merging failed: {e}")
        raise

if __name__ == "__main__":
    main()