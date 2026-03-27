import React from 'react';
import styled, { ThemeProvider } from 'styled-components';

const darkTheme = {
  background: '#333',
  color: '#fff',
};

const Container = styled.div`
  padding: 20px;
`;

const Heading = styled.h1`
  color: ${(props) => props.theme.color};
`;

const AddButton = styled.button`
  background-color: #56b4f7;
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
`;

const ParcelCard = styled.div`
  background-color: #444;
  color: white;
  padding: 10px;
  border-radius: 5px;
`;

const parcels = [
  { id: 1, name: 'Parcel A' },
  { id: 2, name: 'Parcel B' },
  { id: 3, name: 'Parcel C' },
];

const Page = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <Container>
        <Heading>My Parcels</Heading>
        <AddButton>Add Parcel</AddButton>
        <CardGrid>
          {parcels.map((parcel) => (
            <ParcelCard key={parcel.id}>{parcel.name}</ParcelCard>
          ))}
        </CardGrid>
      </Container>
    </ThemeProvider>
  );
};

export default Page;