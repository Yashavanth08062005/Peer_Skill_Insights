
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestDashboard:
    def __init__(self, driver=None):
        self.driver = driver if driver else webdriver.Chrome()
        self.base_url = "http://localhost:5173"
        self.wait = WebDriverWait(self.driver, 10)

    def test_dashboard_elements(self):
        print("\n" + "-"*50)
        print("TEST: Dashboard Elements")
        print("-" * 50)
        try:
            # Ensure on Dashboard
            self.driver.find_element(By.XPATH, "//button[contains(text(), 'Dashboard')]").click()
            time.sleep(1)
            
            # Check Headers
            self.wait.until(EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Dashboard')]")))
            print("✓ Dashboard Header found")
            
            # Check Charts
            # We look for canvases or the container
            charts = self.driver.find_elements(By.TAG_NAME, "canvas")
            if len(charts) >= 1:
                print(f"✓ Found {len(charts)} charts (Canvas elements)")
            else:
                print("⚠ No charts found via Canvas tag (might be loading or using different render)")
                
            # Check Sections
            body = self.driver.find_element(By.TAG_NAME, "body").text
            if "Trending Skills" in body:
                print("✓ 'Trending Skills' section visible")
            else:
                print("❌ 'Trending Skills' text not found")
                return False

            if "Top Companies" in body:
                print("✓ 'Top Companies' section visible")
            else:
                print("❌ 'Top Companies' text not found")
                return False
                
            print("✅ Dashboard Test Passed")
            return True
        except Exception as e:
            print(f"❌ Dashboard Test Failed: {e}")
            return False
