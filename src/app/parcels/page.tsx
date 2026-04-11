import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  width: 100%;
`;

const ParcelCard = styled.div`
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  text-align: center;

  &:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
`;

const AddButton = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  cursor: pointer;

  &:hover {
    background-color: #0056b3;
  }
`;

const EmptyState = styled.div`
  margin-top: 20px;
  color: #7a7a7a;
`;

const Page = () => {
  const [parcels, setParcels] = useState<string[]>([]);

  const handleAddParcel = () => {
    setParcels([...parcels, `Parcel ${parcels.length + 1}`]);
  };

  return (
    <Container>
      <Grid>
        {parcels.map((parcel, index) => (
          <ParcelCard key={index}>
            <p>{parcel}</p>
          </ParcelCard>
        ))}
      </Grid>
      {parcels.length === 0 && (
        <EmptyState>No parcels added yet.</EmptyState>
      )}
      <AddButton onClick={handleAddParcel}>Add Parcel</AddButton>
    </Container>
  );
};

export default Page;