
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestProfile:
    def __init__(self, driver=None):
        self.driver = driver if driver else webdriver.Chrome()
        self.base_url = "http://localhost:5173"
        self.wait = WebDriverWait(self.driver, 10)

    def test_update_profile(self):
        print("\n" + "-"*50)
        print("TEST: Profile Update")
        print("-" * 50)
        try:
            # Navigate to Profile
            self.driver.find_element(By.XPATH, "//button[contains(text(), 'Profile')]").click()
            time.sleep(1)
            print("✓ Navigated to Profile")
            
            # Find Inputs
            name_input = self.driver.find_element(By.ID, "nameInput")
            meta_input = self.driver.find_element(By.ID, "metaInput") # Assuming IDs exist based on script.js analysis
            
            # Update values
            new_name = "Selenium User"
            new_meta = "Automated Testing"
            
            name_input.clear()
            name_input.send_keys(new_name)
            
            meta_input.clear()
            meta_input.send_keys(new_meta)
            
            # Save
            save_btn = self.driver.find_element(By.ID, "saveProfileBtn")
            save_btn.click()
            time.sleep(1)
            
            # Check for success message or persistence
            # We can check a success message if one appears, or just reload page and check values
            # Alert/Toast? script.js says: profileMsg.textContent = "Profile saved."
            
            try:
                msg = self.driver.find_element(By.ID, "profileMsg")
                if "saved" in msg.text.lower():
                    print("✓ Save success message appeared")
            except:
                print("⚠ Success message not detected")
            
            # Reload and verify
            self.driver.refresh()
            time.sleep(2)
            self.driver.find_element(By.XPATH, "//button[contains(text(), 'Profile')]").click() # Re-nav if refresh resets view
            
            name_val = self.driver.find_element(By.ID, "nameInput").get_attribute("value")
            if name_val == new_name:
                print(f"✅ Profile Name updated and persisted: {name_val}")
                return True
            else:
                print(f"❌ Profile Name persistence failed. Got: {name_val}")
                return False

        except Exception as e:
            print(f"❌ Profile Test Failed: {e}")
            return False
