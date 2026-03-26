import React from 'react';
import styled, { ThemeProvider } from 'styled-components';

const darkTheme = {
  background: '#121212',
  foreground: '#ffffff',
  primary: '#6200ea',
};

const ListingCard = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
  background: ${props => props.theme.background};
  color: ${props => props.theme.foreground};
`;

const PriceArea = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #333;
  border-bottom: 1px solid #444;
`;

const Location = styled.div`
  padding: 12px;
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 16px;
`;

const MarketplacePage: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <GridContainer>
        {Array.from({ length: 8 }, (_, i) => (
          <ListingCard key={i}>
            <PriceArea>
              <div>Price: $99.99</div>
              <Location>Location: New York, NY</Location>
            </PriceArea>
          </ListingCard>
        ))}
      </GridContainer>
    </ThemeProvider>
  );
};

export default MarketplacePage;