import React, { useEffect, useState } from 'react';
import styles from './CatChat.module.css';

const CatChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('click', handleOutsideClick);
    } else {
      window.removeEventListener('click', handleOutsideClick);
    }
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [isOpen]);

  const toggleChat = () => setIsOpen(!isOpen);

  const sendMessage = () => {
    if (inputValue.trim()) {
      setMessages([...messages, inputValue]);
      setInputValue('');
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value);

  const handleOutsideClick = (e: MouseEvent) => {
    if (!e.composedPath().includes(document.querySelector(`.${styles.chat}`))) {
      setIsOpen(false);
    }
  };

  return (
    <div className={`${styles.chat} ${isOpen ? styles.open : ''}`}>
      <button onClick={toggleChat}>
        {isOpen ? 'Close' : 'Chat with Cat'}
      </button>
      {isOpen && (
        <div className={styles.container}>
          <ul className={styles.messages}>
            {messages.map((message, index) => (
              <li key={index} className={styles.message}>{message}</li>
            ))}
          </ul>
          <input
            type="text"
            value={inputValue}
            onChange={handleInput}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className={styles.input}
          />
        </div>
      )}
    </div>
  );
};

export default CatChat;