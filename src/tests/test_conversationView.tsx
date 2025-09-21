import React from 'react';
import ConversationView from '../components/ConversationView';

// Simple validation test for ConversationView component
const testConversationView = () => {
  // Test that the component can be imported without errors
  console.log('ConversationView component imported successfully');
  
  // Test data
  const mockConversation = [
    {
      speaker: 'user' as const,
      text: 'Hello Margaret, how are you today?',
      timestamp: new Date(),
      confidence: 0.95
    },
    {
      speaker: 'ai' as const,
      text: 'I am doing well, thank you for asking!',
      timestamp: new Date(),
      emotion: 'empathetic'
    }
  ];
  
  // Test that the component can be instantiated
  const component = (
    <ConversationView 
      conversation={mockConversation} 
      className="test-class"
    />
  );
  
  console.log('ConversationView component instantiated successfully');
  return component;
};

// Run the test
testConversationView();

export default testConversationView;