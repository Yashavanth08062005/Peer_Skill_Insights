
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestNavigation:
    def __init__(self, driver=None):
        self.driver = driver if driver else webdriver.Chrome()
        self.base_url = "http://localhost:5173"
        self.wait = WebDriverWait(self.driver, 10)

    def test_navigation_flow(self):
        print("\n" + "-"*50)
        print("TEST: General Navigation")
        print("-" * 50)
        pages = ["Skill Gap", "Resources"]
        results = {}
        
        try:
            for page in pages:
                print(f"→ Navigating to {page}...")
                btn = self.driver.find_element(By.XPATH, f"//button[contains(text(), '{page}')]")
                btn.click()
                time.sleep(1)
                
                # Check for header
                try:
                    # Usually "Skill Gap Analysis" or "Resource Library"
                    # We check body text for the page name or similar
                    body = self.driver.find_element(By.TAG_NAME, "body").text
                    if page in body or "Analysis" in body or "Library" in body:
                        print(f"✓ {page} loaded successfully")
                        results[page] = True
                    else:
                        print(f"❌ {page} content not found")
                        results[page] = False
                except:
                     print(f"❌ Error verifying {page}")
                     results[page] = False
                     
            if all(results.values()):
                print("✅ Navigation Test Passed")
                return True
            else:
                print("❌ Navigation Test Partial Fail")
                return False
                
        except Exception as e:
            print(f"❌ Navigation Test Failed: {e}")
            return False
