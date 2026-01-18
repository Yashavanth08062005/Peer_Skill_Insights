"""
Selenium Test - Skill Management Functionality
Tests adding and removing skills/companies
"""

import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

class TestSkillManagement:
    def __init__(self):
        self.driver = webdriver.Chrome()
        self.driver.maximize_window()
        self.base_url = "http://localhost:5173"
        self.wait = WebDriverWait(self.driver, 10)
        self.username = f"skilltest_{int(time.time())}"
        self.password = "pass123"
        
    def setup_user(self):
        """Login with existing user"""
        print(f"→ Setting up user (Login only): 01fe24bcs200@kletech.ac.in...")
        self.driver.get(self.base_url)
        time.sleep(1)
        
        # Logout if needed
        try:
            self.driver.find_element(By.CLASS_NAME, "sidebar")
            self.driver.execute_script("localStorage.clear();")
            self.driver.refresh()
            time.sleep(1)
        except:
            pass
            
        # Login
        try:
             # If on register, switch to login
            try:
                switch = self.driver.find_element(By.CLASS_NAME, "auth-switch")
                if "Login" in switch.text:
                    switch.click()
            except:
                pass 
                
            email = self.wait.until(EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Email']")))
            email.clear()
            email.send_keys("01fe24bcs200@kletech.ac.in")
            
            pw = self.driver.find_element(By.XPATH, "//input[@placeholder='Password']")
            pw.clear()
            pw.send_keys("Yash@#$234")
            
            self.driver.find_element(By.XPATH, "//button[contains(text(), 'Login')]").click()
            
            self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "sidebar")))
            print("✓ User setup complete (Logged in)")
            return True
        except Exception as e:
            print(f"⚠ Setup failed: {str(e)}")
            return False

    def test_add_skill(self):
        """Test Case 1: Add new skill and company"""
        print("\n" + "="*60)
        print("TEST CASE 1: Add Skill and Company")
        print("="*60)
        
        try:
            # Navigate to My Skills
            nav_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'My Skills')]")))
            nav_btn.click()
            time.sleep(1)
            
            print("✓ Navigated to My Skills")
            
            # Verify page load
            self.wait.until(EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'My Skills')]")))
            
            # Input Company
            comp_input = self.driver.find_element(By.XPATH, "//input[@placeholder='e.g. Google']")
            comp_input.clear()
            comp_input.send_keys("TestCorp")
            print("✓ Entered Company: TestCorp")
            
            # Input Skill
            skill_input = self.driver.find_element(By.XPATH, "//input[@placeholder='e.g. Python, React']")
            skill_input.clear()
            skill_input.send_keys("Selenium, Python")
            print("✓ Entered Skills: Selenium, Python")
            
            # Click Update
            btn = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Update Details')]")
            btn.click()
            print("✓ Clicked Update Details")
            
            # Wait for update
            time.sleep(2)
            
            # Verify tags appeared
            # We look for text 'TestCorp' and 'Selenium'
            body_text = self.driver.find_element(By.TAG_NAME, "body").text
            
            if "TestCorp" in body_text and "Selenium" in body_text:
                print("✅ TEST PASSED: Skills and Company added successfully!")
                return True
            else:
                print(f"❌ TEST FAILED: Skills/Company not found in page text.\nPage Text Snippet:\n{body_text[:500]}")
                return False
                
        except Exception as e:
            print(f"❌ TEST FAILED: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def test_remove_skill(self):
        """Test Case 2: Remove a skill"""
        print("\n" + "="*60)
        print("TEST CASE 2: Remove Skill")
        print("="*60)
        
        try:
            # Assuming we are on My Skills and have added skills from previous test
            # If not, we might fail. Ideally tests should be atomic, but for this flow it's easier.
            
            # Find a remove button (×)
            # The structure is: <span>SkillName <span onclick=remove>×</span></span>
            # We'll try to find the "Selenium" tag first
            
            print("→ Looking for skill to remove...")
            
            # Get all skill tags
            # Selector from code: .tag-list span (ignoring company tags for a moment)
            # Actually companies are also in .tag-list
            
            skills_section = self.driver.find_element(By.XPATH, "//h4[contains(text(), 'Your Skills')]/following-sibling::div[@class='tag-list']")
            triggers = skills_section.find_elements(By.XPATH, ".//span[contains(text(), '×')]")
            
            if not triggers:
                print("⚠ No skills found to remove!")
                return False
            
            count_before = len(triggers)
            print(f"✓ Found {count_before} skills. Removing first one...")
            
            triggers[0].click()
            time.sleep(2)
            
            # Re-check count
            skills_section = self.driver.find_element(By.XPATH, "//h4[contains(text(), 'Your Skills')]/following-sibling::div[@class='tag-list']")
            triggers_after = skills_section.find_elements(By.XPATH, ".//span[contains(text(), '×')]")
            
            if len(triggers_after) < count_before:
                print("✅ TEST PASSED: Skill removed successfully!")
                return True
            else:
                print("❌ TEST FAILED: Skill count did not decrease.")
                return False

        except Exception as e:
            print(f"❌ TEST FAILED: {str(e)}")
            return False

    def run_all_tests(self):
        print("\n" + "="*70)
        print("SELENIUM TEST SUITE: SKILL MANAGEMENT")
        print("="*70)
        
        # Setup first
        if not self.setup_user():
            print("⚠ User setup failed, aborting tests.")
            return {}

        results = {
            "Add Skill/Company": self.test_add_skill(),
            "Remove Skill": self.test_remove_skill()
        }
        
        passed = sum(1 for v in results.values() if v)
        print("="*70)
        print(f"Total: {passed}/{len(results)} tests passed")
        print("="*70)
        return results

    def close(self):
        time.sleep(2)
        self.driver.quit()
        print("\n✓ Browser closed")

if __name__ == "__main__":
    test = TestSkillManagement()
    try:
        test.run_all_tests()
    finally:
        test.close()
