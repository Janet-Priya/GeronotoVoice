import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../pages/Home';

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
  ])
}));

const mockProps = {
  onStartSimulation: jest.fn(),
  onNavigate: jest.fn(),
  sessionCount: 0,
  achievements: [],
  voiceEnabled: true,
  onVoiceToggle: jest.fn()
};

describe('Home Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders onboarding steps correctly', async () => {
    render(<Home {...mockProps} />);
    
    // Check if onboarding is shown initially
    expect(screen.getByText('Welcome to GerontoVoice')).toBeInTheDocument();
    expect(screen.getByText('AI-Powered Caregiver Training')).toBeInTheDocument();
  });

  test('navigates through onboarding steps', async () => {
    render(<Home {...mockProps} />);
    
    // Click next button
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    // Should show second step
    expect(screen.getByText('Voice-First Experience')).toBeInTheDocument();
  });

  test('completes onboarding and shows main interface', async () => {
    // Mock completed onboarding
    localStorage.setItem('geronto_voice_onboarding_completed', 'true');
    
    render(<Home {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Ready to Practice?')).toBeInTheDocument();
    });
  });

  test('handles persona selection', async () => {
    localStorage.setItem('geronto_voice_onboarding_completed', 'true');
    
    render(<Home {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Choose Your Training Partner')).toBeInTheDocument();
    });
    
    // Click on a persona
    const personaButton = screen.getByText('Margaret');
    fireEvent.click(personaButton);
    
    expect(mockProps.onStartSimulation).toHaveBeenCalledWith('margaret');
  });

  test('toggles voice settings', async () => {
    localStorage.setItem('geronto_voice_onboarding_completed', 'true');
    
    render(<Home {...mockProps} />);
    
    await waitFor(() => {
      const voiceToggle = screen.getByRole('button', { name: /voice/i });
      fireEvent.click(voiceToggle);
    });
    
    expect(mockProps.onVoiceToggle).toHaveBeenCalledWith(false);
  });

  test('navigates to other pages', async () => {
    localStorage.setItem('geronto_voice_onboarding_completed', 'true');
    
    render(<Home {...mockProps} />);
    
    await waitFor(() => {
      const progressButton = screen.getByText('Progress');
      fireEvent.click(progressButton);
    });
    
    expect(mockProps.onNavigate).toHaveBeenCalledWith('progress');
  });
});
