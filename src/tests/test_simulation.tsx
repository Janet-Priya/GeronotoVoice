import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Simulation from '../pages/Simulation';

// Mock the services
jest.mock('../services/api', () => ({
  getPersonas: jest.fn().mockResolvedValue([
    {
      id: 'margaret',
      name: 'Margaret',
      age: 78,
      condition: 'Mild Dementia',
      avatar: '👵',
      personality: 'Gentle, sometimes confused',
      difficulty: 'beginner',
      description: 'Practice with Margaret',
      nihSymptoms: ['Memory loss']
    }
  ]),
  simulateConversation: jest.fn().mockResolvedValue({
    speaker: 'ai',
    text: 'Hello! How are you today?',
    timestamp: new Date(),
    emotion: 'neutral'
  })
}));

const mockProps = {
  onNavigate: jest.fn(),
  onEndSession: jest.fn(),
  selectedPersona: 'margaret',
  voiceEnabled: true,
  onVoiceToggle: jest.fn()
};

describe('Simulation Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders simulation interface correctly', async () => {
    render(<Simulation {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Training Session')).toBeInTheDocument();
      expect(screen.getByText('Margaret')).toBeInTheDocument();
      expect(screen.getByText('78 years old')).toBeInTheDocument();
    });
  });

  test('shows persona avatar and information', async () => {
    render(<Simulation {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('👵')).toBeInTheDocument();
      expect(screen.getByText('Mild Dementia')).toBeInTheDocument();
    });
  });

  test('handles voice button interactions', async () => {
    render(<Simulation {...mockProps} />);
    
    await waitFor(() => {
      const voiceButton = screen.getByRole('button', { name: /tap to speak/i });
      expect(voiceButton).toBeInTheDocument();
    });
  });

  test('shows session controls', async () => {
    render(<Simulation {...mockProps} />);
    
    expect(screen.getByText('End Session')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  test('handles navigation back to home', async () => {
    render(<Simulation {...mockProps} />);
    
    const backButton = screen.getByRole('button', { name: /arrow left/i });
    fireEvent.click(backButton);
    
    expect(mockProps.onNavigate).toHaveBeenCalledWith('home');
  });

  test('handles end session', async () => {
    render(<Simulation {...mockProps} />);
    
    const endButton = screen.getByText('End Session');
    fireEvent.click(endButton);
    
    expect(mockProps.onEndSession).toHaveBeenCalled();
  });

  test('toggles voice settings', async () => {
    render(<Simulation {...mockProps} />);
    
    const voiceToggle = screen.getByRole('button', { name: /volume/i });
    fireEvent.click(voiceToggle);
    
    expect(mockProps.onVoiceToggle).toHaveBeenCalledWith(false);
  });
});
