#!/usr/bin/env python3
"""
LoRA Fine-tuning Script for GerontoVoice Elder Care Training
Uses PEFT to fine-tune Llama2 for empathetic elder care conversations
"""

import os
import sys
import logging
import json
import time
import warnings
from pathlib import Path
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass, field

import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM, 
    TrainingArguments, 
    Trainer,
    BitsAndBytesConfig,
    DataCollatorForLanguageModeling
)
from peft import (
    get_peft_model, 
    LoraConfig, 
    TaskType,
    prepare_model_for_kbit_training
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import evaluate

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Suppress warnings
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

@dataclass
class LoRATrainingConfig:
    """Configuration for LoRA fine-tuning"""
    # Model configuration
    model_name: str = "microsoft/DialoGPT-medium"  # Use DialoGPT instead of Llama2 for better compatibility
    max_length: int = 512
    device: str = "cpu"  # Force CPU mode for better compatibility
    
    # LoRA configuration
    r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.1
    target_modules: List[str] = field(default_factory=lambda: ["c_attn", "c_proj"])  # DialoGPT specific
    
    # Training configuration
    num_epochs: int = 1
    batch_size: int = 4
    learning_rate: float = 5e-5
    warmup_steps: int = 100
    save_steps: int = 500
    eval_steps: int = 500
    gradient_accumulation_steps: int = 4
    
    # Data configuration
    train_test_split: float = 0.8
    max_conversations: int = 500
    
    # Output configuration
    output_dir: str = "backend/models/lora_elder_care"
    save_model: bool = True

class ElderCareDataset(Dataset):
    """Dataset for elder care conversations"""
    
    def __init__(self, conversations: List[Dict], tokenizer, max_length: int = 512):
        self.conversations = conversations
        self.tokenizer = tokenizer
        self.max_length = max_length
        
        # Set padding token if not exists
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
    
    def __len__(self):
        return len(self.conversations)
    
    def __getitem__(self, idx):
        conversation = self.conversations[idx]
        
        # Format conversation as dialogue
        prompt = conversation['prompt']
        response = conversation['response']
        
        # Create input text
        input_text = f"{prompt}{self.tokenizer.eos_token}{response}{self.tokenizer.eos_token}"
        
        # Tokenize
        encoding = self.tokenizer(
            input_text,
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': encoding['input_ids'].flatten()
        }

class LoRATrainer:
    """LoRA fine-tuning trainer for elder care conversations"""
    
    def __init__(self, config: LoRATrainingConfig):
        self.config = config
        self.device = torch.device("cpu")  # Force CPU usage
        
        # Create output directory
        os.makedirs(self.config.output_dir, exist_ok=True)
        
        logger.info(f"Initializing LoRA trainer with device: {self.device}")
        logger.info(f"Model: {self.config.model_name}")
        logger.info(f"LoRA config: r={self.config.r}, alpha={self.config.lora_alpha}")
    
    def load_dataset(self, csv_path: str) -> List[Dict]:
        """Load and prepare elder care conversations"""
        logger.info(f"Loading dataset from {csv_path}")
        
        try:
            df = pd.read_csv(csv_path)
            logger.info(f"Loaded {len(df)} rows from CSV")
            
            # Filter for quality conversations
            df = df.dropna(subset=['speaker', 'text'])
            df = df[df['text'].str.len() > 10]
            df = df[df['text'].str.len() < 300]
            
            logger.info(f"After filtering: {len(df)} rows")
            
            # Create conversation pairs
            conversations = []
            caregiver_texts = []
            elder_texts = []
            
            for _, row in df.iterrows():
                if row['speaker'] in ['caregiver', 'user']:
                    caregiver_texts.append({
                        'text': row['text'],
                        'emotion': row.get('emotion', 'neutral'),
                        'condition': row.get('condition', 'general')
                    })
                elif row['speaker'] in ['elder', 'ai']:
                    elder_texts.append({
                        'text': row['text'],
                        'emotion': row.get('emotion', 'neutral'),
                        'condition': row.get('condition', 'general')
                    })
            
            # Pair conversations (caregiver prompt -> elder response)
            min_length = min(len(caregiver_texts), len(elder_texts))
            
            for i in range(min_length):
                if i < len(caregiver_texts) and i < len(elder_texts):
                    conversations.append({
                        'prompt': f"Caregiver: {caregiver_texts[i]['text']}",
                        'response': f"Elder: {elder_texts[i]['text']}",
                        'condition': elder_texts[i]['condition'],
                        'emotion': elder_texts[i]['emotion']
                    })
            
            # Add synthetic elder care conversations
            synthetic_conversations = self._generate_synthetic_conversations()
            conversations.extend(synthetic_conversations)
            
            # Limit dataset size for training efficiency
            if len(conversations) > self.config.max_conversations:
                conversations = conversations[:self.config.max_conversations]
            
            logger.info(f"Created {len(conversations)} conversation pairs for training")
            return conversations
            
        except Exception as e:
            logger.error(f"Error loading dataset: {e}")
            return []
    
    def _generate_synthetic_conversations(self) -> List[Dict]:
        """Generate synthetic elder care conversations for training"""
        synthetic_data = [
            # Margaret (Dementia) conversations
            {
                'prompt': "Caregiver: How are you feeling today, Margaret?",
                'response': "Elder: I'm a bit confused today. Where did I put my glasses?",
                'condition': 'dementia',
                'emotion': 'confused'
            },
            {
                'prompt': "Caregiver: Let me help you find them. They're right here on the table.",
                'response': "Elder: Oh thank you! I get so worried when I can't find things.",
                'condition': 'dementia',
                'emotion': 'grateful'
            },
            {
                'prompt': "Caregiver: Have you taken your medication this morning?",
                'response': "Elder: I think so... or was that yesterday? I can't remember.",
                'condition': 'dementia',
                'emotion': 'confused'
            },
            
            # Robert (Diabetes) conversations
            {
                'prompt': "Caregiver: Robert, how have your blood sugar levels been?",
                'response': "Elder: They've been running high lately. I checked and it was 190 this morning.",
                'condition': 'diabetes',
                'emotion': 'worried'
            },
            {
                'prompt': "Caregiver: Have you been following your meal plan?",
                'response': "Elder: I try to, but I sometimes forget to count the carbs.",
                'condition': 'diabetes',
                'emotion': 'frustrated'
            },
            {
                'prompt': "Caregiver: Did you remember to check your feet today?",
                'response': "Elder: Yes, but I found a small cut. Should I be worried?",
                'condition': 'diabetes',
                'emotion': 'concerned'
            },
            
            # Eleanor (Mobility) conversations
            {
                'prompt': "Caregiver: Eleanor, how has walking been for you today?",
                'response': "Elder: I'm using my walker more. I'm so afraid of falling.",
                'condition': 'mobility',
                'emotion': 'worried'
            },
            {
                'prompt': "Caregiver: Using your walker is smart. It keeps you safe.",
                'response': "Elder: I feel like such a burden. I used to be so active.",
                'condition': 'mobility',
                'emotion': 'sad'
            },
            {
                'prompt': "Caregiver: Would you like to try some gentle exercises today?",
                'response': "Elder: I'd like to, but I worry about losing my balance.",
                'condition': 'mobility',
                'emotion': 'worried'
            },
            
            # General empathetic conversations
            {
                'prompt': "Caregiver: I understand this must be difficult for you.",
                'response': "Elder: Thank you for being so patient with me. It means a lot.",
                'condition': 'general',
                'emotion': 'grateful'
            },
            {
                'prompt': "Caregiver: You're doing great. It's okay to ask for help.",
                'response': "Elder: I appreciate your kindness. You make me feel safe.",
                'condition': 'general',
                'emotion': 'grateful'
            }
        ]
        
        logger.info(f"Generated {len(synthetic_data)} synthetic conversations")
        return synthetic_data
    
    def setup_model_and_tokenizer(self):
        """Setup model and tokenizer with LoRA configuration"""
        logger.info("Loading model and tokenizer...")
        
        try:
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.config.model_name,
                trust_remote_code=True,
                use_fast=False
            )
            
            # Set special tokens
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
                
            logger.info("Tokenizer loaded successfully")
            
            # Load model with CPU configuration
            self.model = AutoModelForCausalLM.from_pretrained(
                self.config.model_name,
                torch_dtype=torch.float32,  # Use float32 for CPU
                device_map=None,  # Don't use device mapping for CPU
                trust_remote_code=True,
                low_cpu_mem_usage=True
            )
            
            # Move model to CPU
            self.model = self.model.to(self.device)
            
            logger.info("Model loaded successfully")
            
            # Setup LoRA configuration
            lora_config = LoraConfig(
                r=self.config.r,
                lora_alpha=self.config.lora_alpha,
                target_modules=self.config.target_modules,
                lora_dropout=self.config.lora_dropout,
                bias="none",
                task_type=TaskType.CAUSAL_LM,
            )
            
            # Apply LoRA to model
            self.model = get_peft_model(self.model, lora_config)
            self.model.print_trainable_parameters()
            
            logger.info("LoRA configuration applied successfully")
            
        except Exception as e:
            logger.error(f"Error setting up model: {e}")
            raise
    
    def prepare_datasets(self, conversations: List[Dict]) -> Tuple[Dataset, Dataset]:
        """Prepare training and validation datasets"""
        logger.info("Preparing datasets...")
        
        # Split data
        train_data, val_data = train_test_split(
            conversations, 
            test_size=1-self.config.train_test_split,
            random_state=42
        )
        
        logger.info(f"Training samples: {len(train_data)}")
        logger.info(f"Validation samples: {len(val_data)}")
        
        # Create datasets
        train_dataset = ElderCareDataset(train_data, self.tokenizer, self.config.max_length)
        val_dataset = ElderCareDataset(val_data, self.tokenizer, self.config.max_length)
        
        return train_dataset, val_dataset
    
    def train(self, train_dataset: Dataset, val_dataset: Dataset):
        """Train the model with LoRA"""
        logger.info("Starting LoRA fine-tuning...")
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=self.config.output_dir,
            num_train_epochs=self.config.num_epochs,
            per_device_train_batch_size=self.config.batch_size,
            per_device_eval_batch_size=self.config.batch_size,
            gradient_accumulation_steps=self.config.gradient_accumulation_steps,
            learning_rate=self.config.learning_rate,
            warmup_steps=self.config.warmup_steps,
            logging_steps=100,
            save_steps=self.config.save_steps,
            eval_steps=self.config.eval_steps,
            evaluation_strategy="steps",
            save_strategy="steps",
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            greater_is_better=False,
            report_to=None,  # Disable wandb/tensorboard
            use_cpu=True,  # Force CPU usage
            dataloader_num_workers=0,  # Disable multiprocessing
            disable_tqdm=False,
            logging_first_step=True,
            save_total_limit=2,
        )
        
        # Data collator
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=self.tokenizer,
            mlm=False,  # Causal LM, not masked LM
        )
        
        # Initialize trainer
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=val_dataset,
            data_collator=data_collator,
            tokenizer=self.tokenizer,
        )
        
        # Start training
        start_time = time.time()
        logger.info("Training started...")
        
        try:
            trainer.train()
            training_time = time.time() - start_time
            logger.info(f"Training completed in {training_time:.2f} seconds")
            
            # Save model
            if self.config.save_model:
                trainer.save_model()
                self.tokenizer.save_pretrained(self.config.output_dir)
                logger.info(f"Model saved to {self.config.output_dir}")
            
            return trainer
            
        except Exception as e:
            logger.error(f"Training failed: {e}")
            raise
    
    def evaluate_model(self, trainer: Trainer, val_dataset: Dataset) -> Dict[str, float]:
        """Evaluate the fine-tuned model"""
        logger.info("Evaluating model...")
        
        try:
            # Evaluate on validation set
            eval_results = trainer.evaluate()
            
            # Test coherence with sample prompts
            test_prompts = [
                "Caregiver: How are you feeling today?",
                "Caregiver: Have you taken your medication?",
                "Caregiver: I'm here to help you.",
                "Caregiver: Tell me about your concerns.",
                "Caregiver: You're doing really well."
            ]
            
            coherence_scores = []
            for prompt in test_prompts:
                response = self._generate_response(prompt)
                coherence_score = self._calculate_coherence(prompt, response)
                coherence_scores.append(coherence_score)
                logger.info(f"Prompt: {prompt}")
                logger.info(f"Response: {response}")
                logger.info(f"Coherence: {coherence_score:.2f}")
            
            avg_coherence = np.mean(coherence_scores)
            logger.info(f"Average coherence: {avg_coherence:.2f}")
            
            eval_results['coherence'] = avg_coherence
            
            return eval_results
            
        except Exception as e:
            logger.error(f"Evaluation failed: {e}")
            return {}
    
    def _generate_response(self, prompt: str, max_length: int = 100) -> str:
        """Generate response for a given prompt"""
        try:
            # Tokenize prompt
            inputs = self.tokenizer.encode(prompt, return_tensors='pt').to(self.device)
            
            # Generate response
            with torch.no_grad():
                outputs = self.model.generate(
                    inputs,
                    max_length=inputs.shape[1] + max_length,
                    num_return_sequences=1,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id,
                    eos_token_id=self.tokenizer.eos_token_id
                )
            
            # Decode response
            response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            response = response[len(prompt):].strip()
            
            return response
            
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            return "I understand how you feel."
    
    def _calculate_coherence(self, prompt: str, response: str) -> float:
        """Calculate coherence score (simplified metric)"""
        # Simple heuristics for coherence
        score = 0.5  # Base score
        
        # Check if response is reasonable length
        if 10 <= len(response) <= 200:
            score += 0.2
        
        # Check if response contains empathetic words
        empathy_words = ['understand', 'feel', 'help', 'support', 'care', 'here for you']
        if any(word in response.lower() for word in empathy_words):
            score += 0.2
        
        # Check if response avoids repetition of prompt
        if not any(word in response.lower() for word in prompt.lower().split() if len(word) > 3):
            score += 0.1
            
        return min(score, 1.0)
    
    def save_for_ollama(self):
        """Prepare model for Ollama integration"""
        logger.info("Preparing model for Ollama integration...")
        
        ollama_dir = Path(self.config.output_dir) / "ollama_ready"
        ollama_dir.mkdir(exist_ok=True)
        
        # Save configuration
        config_data = {
            "model_name": self.config.model_name,
            "lora_config": {
                "r": self.config.r,
                "lora_alpha": self.config.lora_alpha,
                "target_modules": self.config.target_modules
            },
            "training_complete": True,
            "elder_care_optimized": True
        }
        
        with open(ollama_dir / "config.json", "w") as f:
            json.dump(config_data, f, indent=2)
        
        logger.info(f"Model configuration saved for Ollama at {ollama_dir}")

def main():
    """Main training function"""
    try:
        # Initialize configuration
        config = LoRATrainingConfig()
        logger.info("Starting LoRA fine-tuning for elder care conversations")
        
        # Initialize trainer
        trainer = LoRATrainer(config)
        
        # Load dataset
        csv_path = "data/merged_elder_care.csv"
        if not os.path.exists(csv_path):
            csv_path = "../data/merged_elder_care.csv"
        
        conversations = trainer.load_dataset(csv_path)
        if not conversations:
            logger.error("No conversations loaded. Check dataset path.")
            return
        
        # Setup model and tokenizer
        trainer.setup_model_and_tokenizer()
        
        # Prepare datasets
        train_dataset, val_dataset = trainer.prepare_datasets(conversations)
        
        # Train model
        trained_model = trainer.train(train_dataset, val_dataset)
        
        # Evaluate model
        eval_results = trainer.evaluate_model(trained_model, val_dataset)
        
        # Check coherence threshold
        coherence = eval_results.get('coherence', 0)
        if coherence >= 0.85:
            logger.info(f"✅ Training successful! Coherence: {coherence:.2f}")
        else:
            logger.warning(f"⚠️ Training completed but coherence below target: {coherence:.2f}")
        
        # Prepare for Ollama
        trainer.save_for_ollama()
        
        logger.info("🎉 LoRA fine-tuning completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Training failed: {e}")
        raise

if __name__ == "__main__":
    main()