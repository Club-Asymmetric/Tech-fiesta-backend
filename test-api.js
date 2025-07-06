// Simple test script to verify API integration
const API_BASE_URL = "http://localhost:5000/api";

async function testAPI() {
  console.log("Testing Tech Fiesta 2025 API...\n");

  try {
    // Test health endpoint
    console.log("1. Testing health endpoint...");
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log("✅ Health check:", healthData.message);

    // Test events endpoint
    console.log("\n2. Testing events endpoint...");
    const eventsResponse = await fetch(`${API_BASE_URL}/events`);
    const eventsData = await eventsResponse.json();
    console.log(`✅ Events loaded: ${eventsData.data.length} events`);

    // Show sample event with CIT pricing
    const sampleEvent = eventsData.data[0];
    console.log(`   Sample event: ${sampleEvent.title}`);
    console.log(`   Regular price: ${sampleEvent.price}`);
    console.log(`   CIT price: ${sampleEvent.citPrice}`);

    // Test workshops endpoint
    console.log("\n3. Testing workshops endpoint...");
    const workshopsResponse = await fetch(`${API_BASE_URL}/workshops`);
    const workshopsData = await workshopsResponse.json();
    console.log(`✅ Workshops loaded: ${workshopsData.data.length} workshops`);

    // Show sample workshop with CIT pricing
    const sampleWorkshop = workshopsData.data[0];
    console.log(`   Sample workshop: ${sampleWorkshop.title}`);
    console.log(`   Regular price: ${sampleWorkshop.price}`);
    console.log(`   CIT price: ${sampleWorkshop.citPrice}`);

    // Test specific endpoints
    console.log("\n4. Testing specific endpoints...");

    const techEventsResponse = await fetch(`${API_BASE_URL}/events/tech`);
    const techEventsData = await techEventsResponse.json();
    console.log(`✅ Tech events: ${techEventsData.data.length} events`);

    const nonTechEventsResponse = await fetch(
      `${API_BASE_URL}/events/non-tech`
    );
    const nonTechEventsData = await nonTechEventsResponse.json();
    console.log(`✅ Non-tech events: ${nonTechEventsData.data.length} events`);

    console.log("\n🎉 All API tests passed successfully!");
    console.log("\nNext steps:");
    console.log("1. Set up your Firebase project");
    console.log("2. Configure environment variables");
    console.log("3. Start the frontend development server");
    console.log("4. Test the complete authentication flow");
  } catch (error) {
    console.error("❌ API test failed:", error.message);
    console.log("\nTroubleshooting:");
    console.log("1. Make sure the backend server is running on port 5000");
    console.log("2. Check that all dependencies are installed");
    console.log("3. Verify the API endpoints are accessible");
  }
}

// Run the test
testAPI();
