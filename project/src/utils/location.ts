export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

export const getCurrentLocation = (): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // In a real implementation, you would use a reverse geocoding service
          // For demo purposes, we'll use a mock address
          const address = await getMockAddress();
          
          resolve({
            latitude,
            longitude,
            address,
          });
        } catch {
          resolve({
            latitude,
            longitude,
            address: 'Campus Location',
          });
        }
      },
      () => {
        // Fallback to campus coordinates
        resolve({
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'Campus - Main Building',
        });
      }
    );
  });
};

const getMockAddress = async (): Promise<string> => {
  // Simulate reverse geocoding delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock addresses based on common campus locations
  const mockAddresses = [
    'Computer Science Building, Room 101',
    'Engineering Block, Lecture Hall A',
    'Main Campus Library',
    'Administration Building',
    'Student Center, Room 205',
  ];
  
  return mockAddresses[Math.floor(Math.random() * mockAddresses.length)];
};