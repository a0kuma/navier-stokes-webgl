// Quick Test Script for Bouncing Obstacles System
// Run this in the browser console to test the dynamic obstacle system

console.log("🎯 Bouncing Obstacles Test Script");

// Wait for the page to fully load
if (typeof dynamicObstacleController === 'undefined') {
    console.log("⏳ Waiting for dynamic obstacle controller to load...");
    setTimeout(() => {
        console.log("🔄 Please try running this script again after the page loads completely");
    }, 2000);
} else {
    console.log("✅ Dynamic obstacle controller found!");
    
    // Test functions
    function testObstacleCreation() {
        console.log("🔧 Testing obstacle creation...");
        
        // Enable the system
        dynamicObstacleController.setEnabled(true);
        console.log("✅ Dynamic obstacles enabled");
        
        // Create test obstacles
        const obstacle1 = dynamicObstacleController.addObstacle([0.3, 0.3], [0.05, 0.05], 1.0, 0.95, 0.8);
        const obstacle2 = dynamicObstacleController.addObstacle([0.7, 0.7], [0.04, 0.04], 1.5, 0.90, 0.9);
        
        console.log("✅ Created obstacles:", obstacle1?.id, obstacle2?.id);
        
        return [obstacle1, obstacle2];
    }
    
    function testObstaclePhysics() {
        console.log("🏀 Testing obstacle physics...");
        
        // Get current obstacles
        const obstacles = obstacleMap.getDynamicObstacles ? obstacleMap.getDynamicObstacles() : [];
        console.log(`📊 Found ${obstacles.length} obstacles`);
        
        if (obstacles.length > 0) {
            // Apply some velocity to test physics
            obstacles[0].vel = [0.1, 0.05];
            console.log("✅ Applied velocity to first obstacle");
        }
    }
    
    function testControlPanelUpdate() {
        console.log("🎛️ Testing control panel updates...");
        
        // Check if control panel exists
        const controlPanel = document.getElementById('dynamic-obstacle-control');
        if (controlPanel) {
            console.log("✅ Control panel found and should be updating");
        } else {
            console.log("⚠️ Control panel not found - may need to enable dynamic mode first");
        }
    }
    
    function runFullTest() {
        console.log("🚀 Running full test suite...");
        
        // Switch to dynamic obstacles mode
        const dynamicRadio = document.getElementById('obstacles-dynamic-id');
        if (dynamicRadio) {
            dynamicRadio.checked = true;
            dynamicRadio.dispatchEvent(new Event('change'));
            console.log("✅ Switched to dynamic obstacles mode");
        } else {
            console.log("❌ Dynamic radio button not found");
            return;
        }
        
        setTimeout(() => {
            testObstacleCreation();
            testObstaclePhysics();
            testControlPanelUpdate();
            
            console.log("🎉 Test completed! Check the simulation for bouncing obstacles.");
            console.log("💡 Tip: Switch display to 'Velocity' to see fluid interaction");
        }, 500);
    }
    
    // Expose test functions globally
    window.testBouncing = {
        runFullTest,
        testObstacleCreation,
        testObstaclePhysics,
        testControlPanelUpdate
    };
    
    console.log("🎮 Test functions available:");
    console.log("  testBouncing.runFullTest() - Run complete test");
    console.log("  testBouncing.testObstacleCreation() - Test creation only");
    console.log("  testBouncing.testObstaclePhysics() - Test physics only");
    console.log("  testBouncing.testControlPanelUpdate() - Test UI updates");
    
    console.log("\n🏁 Ready to test! Run: testBouncing.runFullTest()");
}
