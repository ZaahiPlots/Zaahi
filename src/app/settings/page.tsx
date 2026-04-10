"use client";
import React, { useState } from 'react';

const SettingsPage = () => {
  const [profileName, setProfileName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [language, setLanguage] = useState<'EN' | 'AR' | 'RU'>('EN');
  const [darkMode, setDarkMode] = useState<boolean>(false);

  return (
    <div>
      <h1>Settings</h1>
      <div>
        <label htmlFor="profileName">Profile Name:</label>
        <input
          id="profileName"
          type="text"
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {isVerified && <span>Verification Badge</span>}
      <div>
        <label>Select Language:</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value as 'EN' | 'AR' | 'RU')}>
          <option value="EN">English</option>
          <option value="AR">Arabic</option>
          <option value="RU">Russian</option>
        </select>
      </div>
      <label>
        Dark Mode
        <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
      </label>
    </div>
  );
};

export default SettingsPage;