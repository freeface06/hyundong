import os
import sys
import json
from playwright.sync_api import sync_playwright

def run_address_e2e_tests():
    print("=" * 80)
    print("EMPIRICAL PLAYWRIGHT E2E TEST SUITE: MEMBER ADDRESS & CHECKOUT INTEGRATION")
    print("=" * 80)
    
    failures = []
    passes = []
    
    def log_pass(msg):
        passes.append(msg)
        print(f"  [PASS] {msg}", flush=True)
        
    def log_fail(msg, details=""):
        failures.append((msg, details))
        print(f"  [FAIL] {msg} -> {details}", flush=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        
        # Auto-accept dialogs once
        page.on("dialog", lambda d: d.accept())

        # Reset localStorage before test
        page.goto("about:blank")
        abs_path = "file:///" + os.path.abspath("index.html").replace("\\", "/")
        print(f"Navigating to: {abs_path}", flush=True)
        page.goto(abs_path)
        page.wait_for_load_state("domcontentloaded")
        
        # Clean local storage and reset demo state
        page.evaluate("() => { window.localStorage.clear(); if (window.HyundongStore) window.HyundongStore.resetState(); }")
        page.reload()
        page.wait_for_timeout(200)

        # -------------------------------------------------------------
        # STEP 1: Verify Initial Login & User
        # -------------------------------------------------------------
        print("\n--- STEP 1: Verify Initial User & Addresses ---", flush=True)
        user_info = page.evaluate("""() => {
            const S = window.HyundongStore;
            const state = S ? S.loadState() : null;
            return {
                user: state ? state.currentUser : null,
                membersCount: state ? state.members.length : 0,
                jeongAddrs: S ? S.getMemberAddresses('dr_jeong82') : []
            };
        }""")
        
        if user_info["user"] and user_info["user"]["loginId"] == "dr_jeong82":
            log_pass(f"Current user logged in as dr_jeong82 (name: {user_info['user']['name']})")
        else:
            log_fail("Current user is not logged in as dr_jeong82", str(user_info))
            
        if len(user_info["jeongAddrs"]) == 2:
            log_pass(f"Member dr_jeong82 has 2 addresses initially (default: {user_info['jeongAddrs'][0]['addressName']})")
        else:
            log_fail("Expected 2 addresses initially", str(user_info["jeongAddrs"]))

        # -------------------------------------------------------------
        # STEP 2: Navigate to Checkout View & Verify Address Chips
        # -------------------------------------------------------------
        print("\n--- STEP 2: Checkout View & Address Chips Rendering ---", flush=True)
        page.evaluate("""() => {
            // Add a book to cart to ensure checkout has items
            const S = window.HyundongStore;
            const state = S.loadState();
            state.cart = [{ bookId: 'BK-001', qty: 1, checked: true }];
            S.saveState(state);
            // Navigate to cart/checkout view
            const btn = document.querySelector('[data-nav=\"cart\"], [data-nav=\"checkout\"]');
            if (btn) btn.click();
        }""")
        page.wait_for_timeout(300)
        
        chips_info = page.evaluate("""() => {
            const chips = Array.from(document.querySelectorAll('.checkout-addr-chip'));
            return chips.map(c => ({
                text: c.innerText.trim(),
                isSelected: c.classList.contains('is-selected'),
                addrId: c.getAttribute('data-select-checkout-addr')
            }));
        }""")
        
        if len(chips_info) == 3: # 2 addresses + 1 NEW button
            log_pass(f"Rendered {len(chips_info)} checkout address chips")
        else:
            log_fail(f"Expected 3 chips, found {len(chips_info)}", str(chips_info))
            
        default_chip = next((c for c in chips_info if "기본" in c["text"]), None)
        if default_chip and default_chip["isSelected"]:
            log_pass(f"Default address chip '{default_chip['text']}' is initially selected")
        else:
            log_fail("Default address chip is not selected initially", str(chips_info))

        # Check pre-filled inputs (supporting both recipientName and ordRecipient)
        form_vals = page.evaluate("""() => {
            const getVal = (id1, id2) => {
                const el = document.getElementById(id1) || document.getElementById(id2);
                return el ? el.value : '';
            };
            return {
                recipient: getVal('recipientName', 'ordRecipient'),
                phone: getVal('recipientPhone', 'ordPhone'),
                zip: getVal('recipientZip', 'ordZip'),
                addr: getVal('recipientAddress', 'ordAddr'),
                memo: getVal('recipientMemo', 'ordMemo')
            };
        }""")
        
        if form_vals["recipient"] == "정지훈" and form_vals["zip"] == "06631":
            log_pass(f"Form inputs correctly auto-filled with default address: recipient={form_vals['recipient']}, zip={form_vals['zip']}")
        else:
            log_fail("Form inputs not matching default address", str(form_vals))

        # -------------------------------------------------------------
        # STEP 3: Click Second Address Chip (자택) & Verify Auto-Fill
        # -------------------------------------------------------------
        print("\n--- STEP 3: Switch Address Chip to '자택' ---", flush=True)
        page.evaluate("""() => {
            const secondChip = document.querySelector('[data-select-checkout-addr=\"ADDR-1001-2\"]');
            if (secondChip) secondChip.click();
        }""")
        page.wait_for_timeout(200)
        
        second_form_vals = page.evaluate("""() => {
            const getVal = (id1, id2) => {
                const el = document.getElementById(id1) || document.getElementById(id2);
                return el ? el.value : '';
            };
            return {
                recipient: getVal('recipientName', 'ordRecipient'),
                phone: getVal('recipientPhone', 'ordPhone'),
                zip: getVal('recipientZip', 'ordZip'),
                addr: getVal('recipientAddress', 'ordAddr'),
                memo: getVal('recipientMemo', 'ordMemo')
            };
        }""")
        
        if second_form_vals["zip"] == "06540" and "반포대로 201" in second_form_vals["addr"]:
            log_pass(f"Selecting '자택' auto-filled zip={second_form_vals['zip']}, addr={second_form_vals['addr']}")
        else:
            log_fail("Selecting '자택' did not auto-fill correctly", str(second_form_vals))

        # -------------------------------------------------------------
        # STEP 4: Click '+ 새 배송지 직접 입력' & Test Saving to Address Book
        # -------------------------------------------------------------
        print("\n--- STEP 4: Select '+ 새 배송지 직접 입력' & Fill New Address ---", flush=True)
        page.evaluate("""() => {
            const newChip = document.querySelector('[data-select-checkout-addr=\"NEW\"]');
            if (newChip) newChip.click();
        }""")
        page.wait_for_timeout(200)
        
        new_chip_state = page.evaluate("""() => {
            const wrap = document.getElementById('checkoutNewAddrSaveWrap');
            const getVal = (id1, id2) => {
                const el = document.getElementById(id1) || document.getElementById(id2);
                return el ? el.value : '';
            };
            return {
                wrapVisible: wrap ? (window.getComputedStyle(wrap).display !== 'none') : false,
                recipientVal: getVal('recipientName', 'ordRecipient'),
                addrVal: getVal('recipientAddress', 'ordAddr')
            };
        }""")
        
        if new_chip_state["wrapVisible"] and new_chip_state["recipientVal"] == "" and new_chip_state["addrVal"] == "":
            log_pass("Selecting 'NEW' cleared form inputs and displayed #checkoutNewAddrSaveWrap")
        else:
            log_fail("Selecting 'NEW' failed to clear inputs or show save checkbox", str(new_chip_state))

        # Fill custom address values and check save checkbox
        page.evaluate("""() => {
            const setVal = (id1, id2, val) => {
                const el = document.getElementById(id1) || document.getElementById(id2);
                if (el) {
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            };
            setVal('recipientName', 'ordRecipient', '이동원 원장');
            setVal('recipientPhone', 'ordPhone', '010-8888-9999');
            setVal('recipientZip', 'ordZip', '03045');
            setVal('recipientAddress', 'ordAddr', '서울특별시 종로구 사직로 161 이동원한의원');
            setVal('recipientMemo', 'ordMemo', '원장실 직접 전달');
            
            const chkSave = document.getElementById('chkSaveToAddressBook');
            if (chkSave) {
                chkSave.checked = true;
                chkSave.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }""")
        page.wait_for_timeout(100)
        
        sub_wrap_state = page.evaluate("""() => {
            const sub = document.getElementById('chkSaveDefaultSubWrap');
            return sub ? (window.getComputedStyle(sub).display !== 'none') : false;
        }""")
        
        if sub_wrap_state:
            log_pass("Checking '내 배송지 목록에 저장' revealed '기본 배송지로 지정' sub-option")
        else:
            log_fail("Sub-option '기본 배송지로 지정' not shown after checking save option")

        # Mark as default
        page.evaluate("""() => {
            const chkDef = document.getElementById('chkSaveToAddressBookDefault');
            if (chkDef) chkDef.checked = true;
        }""")

        # -------------------------------------------------------------
        # STEP 5: Submit Order & Verify New Address Persistence
        # -------------------------------------------------------------
        print("\n--- STEP 5: Submit Order & Verify Address Book Persistence ---", flush=True)
        page.evaluate("""() => {
            const btnSubmit = document.getElementById('btnSubmitOrder');
            if (btnSubmit) btnSubmit.click();
        }""")
        page.wait_for_timeout(500)
        
        # Verify order created and new address persisted
        post_order_state = page.evaluate("""() => {
            const S = window.HyundongStore;
            const state = S ? S.loadState() : null;
            const addrs = S ? S.getMemberAddresses('dr_jeong82') : [];
            return {
                orderCount: state ? state.orders.length : 0,
                latestOrder: state && state.orders.length > 0 ? state.orders[0] : null,
                addrsCount: addrs.length,
                addrs: addrs
            };
        }""")
        
        if post_order_state["latestOrder"] and post_order_state["latestOrder"]["recipientName"] == "이동원 원장":
            log_pass(f"Order created successfully: orderNo={post_order_state['latestOrder']['orderNo']}, recipient={post_order_state['latestOrder']['recipientName']}")
        else:
            log_fail("Order not created with expected recipient", str(post_order_state["latestOrder"]))
            
        if post_order_state["addrsCount"] == 3:
            log_pass(f"Address book count incremented from 2 to 3! Found 3 addresses")
        else:
            log_fail(f"Expected 3 addresses after saving on checkout, found {post_order_state['addrsCount']}", str(post_order_state["addrs"]))
            
        new_saved_addr = next((a for a in post_order_state["addrs"] if "이동원" in a["recipientName"]), None)
        if new_saved_addr:
            log_pass(f"Newly saved address found: id={new_saved_addr['id']}, name={new_saved_addr['addressName']}, isDefault={new_saved_addr['isDefault']}")
            if new_saved_addr["isDefault"] is True:
                log_pass("Newly saved address correctly designated as isDefault: true")
            else:
                log_fail("Newly saved address expected isDefault: true, got false")
        else:
            log_fail("Newly saved address not found in member addresses", str(post_order_state["addrs"]))

        # Verify single default invariant after checkout address addition
        default_count = len([a for a in post_order_state["addrs"] if a.get("isDefault") is True])
        if default_count == 1:
            log_pass("Single default invariant maintained after checkout addition (exactly 1 default)")
        else:
            log_fail(f"Single default invariant VIOLATED: found {default_count} defaults", str(post_order_state["addrs"]))

        # -------------------------------------------------------------
        # STEP 6: My Page Address Book View & Card Rendering
        # -------------------------------------------------------------
        print("\n--- STEP 6: Address Book View & UI Verification ---", flush=True)
        page.evaluate("""() => {
            const btn = document.querySelector('[data-nav=\"addresses\"]');
            if (btn) btn.click();
        }""")
        page.wait_for_timeout(300)
        
        cards_info = page.evaluate("""() => {
            const cards = Array.from(document.querySelectorAll('.address-card'));
            return cards.map(c => ({
                id: c.getAttribute('data-addr-id'),
                isDefaultCard: c.classList.contains('is-default'),
                hasDefaultBadge: Boolean(c.querySelector('.badge-brand')),
                hasSetDefaultBtn: Boolean(c.querySelector('[data-set-default-address], [data-set-default-addr]')),
                hasDeleteBtn: Boolean(c.querySelector('[data-delete-address], [data-delete-addr]')),
                isDeleteDisabled: Boolean(c.querySelector('[data-delete-address][disabled], [data-delete-addr][disabled]') || !c.querySelector('[data-delete-address], [data-delete-addr]'))
            }));
        }""")
        
        if len(cards_info) == 3:
            log_pass(f"Address Book View rendered {len(cards_info)} address cards")
        else:
            log_fail(f"Expected 3 address cards, found {len(cards_info)}", str(cards_info))
            
        default_card = next((c for c in cards_info if c["isDefaultCard"]), None)
        if default_card and default_card["hasDefaultBadge"] and default_card["isDeleteDisabled"]:
            log_pass(f"Default card ({default_card['id']}) has default badge and its delete button is guarded/disabled")
        else:
            log_fail("Default card does not have guarded delete button or default badge", str(default_card))

        # -------------------------------------------------------------
        # STEP 7: Change Default Address via UI
        # -------------------------------------------------------------
        print("\n--- STEP 7: Switch Default Address to '자택' (ADDR-1001-2) ---", flush=True)
        page.evaluate("""() => {
            const setDefBtn = document.querySelector('[data-set-default-address=\"ADDR-1001-2\"], [data-set-default-addr=\"ADDR-1001-2\"]');
            if (setDefBtn) setDefBtn.click();
        }""")
        page.wait_for_timeout(300)
        
        updated_cards = page.evaluate("""() => {
            const cards = Array.from(document.querySelectorAll('.address-card'));
            return cards.map(c => ({
                id: c.getAttribute('data-addr-id'),
                isDefaultCard: c.classList.contains('is-default'),
                isDeleteDisabled: Boolean(c.querySelector('[data-delete-address][disabled], [data-delete-addr][disabled]') || !c.querySelector('[data-delete-address], [data-delete-addr]'))
            }));
        }""")
        
        target_card = next((c for c in updated_cards if c["id"] == "ADDR-1001-2"), None)
        if target_card and target_card["isDefaultCard"] and target_card["isDeleteDisabled"]:
            log_pass(f"Address ADDR-1001-2 is now the default card and its delete button is guarded")
        else:
            log_fail("Switching default to ADDR-1001-2 failed in UI", str(updated_cards))

        # -------------------------------------------------------------
        # STEP 8: Modal Add Address (+ 새 배송지 추가)
        # -------------------------------------------------------------
        print("\n--- STEP 8: Open Modal & Add New Address ---", flush=True)
        page.evaluate("""() => {
            const openBtn = document.querySelector('[data-open-address-modal], [data-open-add-addr=\"true\"]');
            if (openBtn) openBtn.click();
        }""")
        page.wait_for_timeout(200)
        
        modal_opened = page.evaluate("""() => {
            const modal = document.getElementById('addressModal') || document.getElementById('addressEditModal');
            return modal ? (modal.classList.contains('is-open') || modal.style.display !== 'none' || Boolean(modal.closest('.modal-backdrop.is-open'))) : false;
        }""")
        if modal_opened:
            log_pass("Modal opened successfully")
        else:
            log_fail("Modal failed to open")
            
        page.evaluate("""() => {
            const setVal = (id1, id2, val) => {
                const el = document.getElementById(id1) || document.getElementById(id2);
                if (el) el.value = val;
            };
            setVal('addrName', 'addrFormName', '동국대 한의학관');
            setVal('addrRecipient', 'addrFormRecipient', '박연구원');
            setVal('addrPhone', 'addrFormPhone', '010-4444-5555');
            setVal('addrZip', 'addrFormZip', '10326');
            setVal('addrLine1', 'addrFormLine1', '경기도 고양시 일산동구 동국로 32');
            setVal('addrLine2', 'addrFormLine2', '한의학관 4층');
            setVal('addrMemo', 'addrFormMemo', '연구실 문 앞');
            const defEl = document.getElementById('addrIsDefault') || document.getElementById('addrFormIsDefault');
            if (defEl) defEl.checked = false;
            
            const form = document.getElementById('addressEditForm') || document.getElementById('addressForm');
            if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }""")
        page.wait_for_timeout(300)
        
        cards_after_add = page.evaluate("() => document.querySelectorAll('.address-card').length")
        if cards_after_add == 4:
            log_pass(f"Address count increased to 4 after modal submission")
        else:
            log_fail(f"Expected 4 address cards after adding via modal, got {cards_after_add}")

        # -------------------------------------------------------------
        # STEP 9: Delete Non-Default Address
        # -------------------------------------------------------------
        print("\n--- STEP 9: Delete Non-Default Address via UI ---", flush=True)
        
        # Find the ID of the newly added address
        new_addr_id = page.evaluate("""() => {
            const cards = Array.from(document.querySelectorAll('.address-card'));
            const target = cards.find(c => c.innerText.includes('동국대 한의학관'));
            return target ? target.getAttribute('data-addr-id') : null;
        }""")
        
        if new_addr_id:
            page.evaluate(f"""() => {{
                const delBtn = document.querySelector('[data-delete-address="{new_addr_id}"], [data-delete-addr="{new_addr_id}"]');
                if (delBtn) delBtn.click();
            }}""")
            page.wait_for_timeout(300)
            
            cards_after_del = page.evaluate("() => document.querySelectorAll('.address-card').length")
            if cards_after_del == 3:
                log_pass(f"Successfully deleted address {new_addr_id}; count returned to 3")
            else:
                log_fail(f"Expected 3 cards after deletion, got {cards_after_del}")
        else:
            log_fail("Could not find newly added address to delete")

        browser.close()
        
    print("\n" + "=" * 80)
    print(f"PLAYWRIGHT E2E SUMMARY: Passed: {len(passes)}, Failed: {len(failures)}")
    print("=" * 80)
    
    if failures:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    run_address_e2e_tests()
