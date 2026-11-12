"""
Empirical test for checkout state clobber flaw verification.
Verifies:
1. Adding an address on checkout with "내 배송지 목록에 저장" checked.
2. Order submission executes submitCheckoutOrder().
3. Address is persisted to localStorage (Store.loadState()).
4. Stale in-memory state does NOT overwrite/clobber the address in localStorage.
5. Page reload preserves the new address in localStorage and My Page Address Book.
"""

import os
import sys
from playwright.sync_api import sync_playwright

def test_checkout_state_clobber():
    abs_path = "file:///" + os.path.abspath("index.html").replace("\\", "/")
    print(f"Testing target: {abs_path}")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("dialog", lambda d: d.accept())

        # Step 1: Navigate to fresh state
        page.goto(abs_path)
        page.wait_for_load_state("domcontentloaded")
        page.evaluate("() => { window.localStorage.clear(); if (window.HyundongStore) window.HyundongStore.resetState(); }")
        page.reload()
        page.wait_for_timeout(300)

        # Check initial member addresses count
        init_addrs_count = page.evaluate("""() => {
            const S = window.HyundongStore || window.Store;
            return S.getMemberAddresses('dr_jeong82').length;
        }""")
        print(f"[STEP 1] Initial dr_jeong82 addresses count: {init_addrs_count}")
        assert init_addrs_count == 2, f"Expected 2 initial addresses, got {init_addrs_count}"

        # Step 2: Add book to cart and navigate to checkout
        page.evaluate("""() => {
            const S = window.HyundongStore || window.Store;
            const state = S.loadState();
            state.cart = [{ bookId: 'BK-001', qty: 1, checked: true }];
            S.saveState(state);
            const cartNav = document.querySelector('[data-nav="cart"], [data-nav="checkout"]');
            if (cartNav) cartNav.click();
        }""")
        page.wait_for_timeout(300)

        # Verify checkout view is rendered
        form_exists = page.evaluate("() => Boolean(document.getElementById('checkoutOrderForm'))")
        assert form_exists, "Checkout order form not rendered"

        # Step 3: Select NEW address chip
        page.evaluate("""() => {
            const newChip = document.querySelector('[data-select-checkout-addr="NEW"]');
            if (newChip) newChip.click();
        }""")
        page.wait_for_timeout(200)

        # Step 4: Fill address details and check "내 배송지 목록에 저장"
        page.evaluate("""() => {
            const setVal = (id1, id2, val) => {
                const el = document.getElementById(id1) || document.getElementById(id2);
                if (el) {
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            };
            setVal('recipientName', 'ordRecipient', '허준 원장');
            setVal('recipientPhone', 'ordPhone', '010-9999-8888');
            setVal('recipientZip', 'ordZip', '06631');
            setVal('recipientAddress', 'ordAddr', '서울특별시 강남구 테헤란로 123');
            setVal('recipientMemo', 'ordMemo', '원장실 전달');

            const chkSave = document.getElementById('chkSaveToAddressBook');
            if (chkSave) {
                chkSave.checked = true;
                chkSave.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const chkDef = document.getElementById('chkSaveToAddressBookDefault');
            if (chkDef) {
                chkDef.checked = true;
                chkDef.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }""")
        page.wait_for_timeout(200)

        # Step 5: Submit order
        print("[STEP 2] Submitting order via #btnSubmitOrder...")
        page.evaluate("""() => {
            const btn = document.getElementById('btnSubmitOrder');
            if (btn) btn.click();
        }""")
        page.wait_for_timeout(600)

        # Step 6: Verify order created and address count in localStorage immediately
        post_order = page.evaluate("""() => {
            const S = window.HyundongStore || window.Store;
            const state = S.loadState();
            const addrs = S.getMemberAddresses('dr_jeong82');
            return {
                orderCount: state.orders.length,
                latestOrderRecipient: state.orders[0] ? state.orders[0].recipientName : null,
                addrsCount: addrs.length,
                addrs: addrs
            };
        }""")
        print(f"[STEP 3] Post-order addrsCount in localStorage: {post_order['addrsCount']}")
        print(f"         Latest order recipient: {post_order['latestOrderRecipient']}")

        assert post_order["orderCount"] >= 1, "Order was not created"
        assert post_order["latestOrderRecipient"] == "허준 원장", f"Order recipient mismatch: {post_order['latestOrderRecipient']}"
        assert post_order["addrsCount"] == 3, f"Expected 3 addresses after checkout save, got {post_order['addrsCount']}"

        new_addr = next((a for a in post_order["addrs"] if a["recipientName"] == "허준 원장"), None)
        assert new_addr is not None, "New address not found in dr_jeong82 addresses"
        assert new_addr["isDefault"] is True, f"Expected isDefault: True, got {new_addr['isDefault']}"
        print(f"[STEP 4] Found persisted address: id={new_addr['id']}, isDefault={new_addr['isDefault']}")

        # Step 7: RELOAD PAGE to verify persistence against page refresh
        print("[STEP 5] Reloading page to test persistence across page lifecycle...")
        page.reload()
        page.wait_for_timeout(400)

        post_reload_addrs = page.evaluate("""() => {
            const S = window.HyundongStore || window.Store;
            return S.getMemberAddresses('dr_jeong82');
        }""")
        print(f"[STEP 6] Post-reload dr_jeong82 addrsCount: {len(post_reload_addrs)}")
        assert len(post_reload_addrs) == 3, f"Address was lost after reload! Expected 3, got {len(post_reload_addrs)}"

        reloaded_new_addr = next((a for a in post_reload_addrs if a["recipientName"] == "허준 원장"), None)
        assert reloaded_new_addr is not None, "New address was lost after reload!"
        assert reloaded_new_addr["isDefault"] is True, "New address default status was lost after reload!"

        # Step 8: Navigate to My Page Address Book and verify DOM rendering
        print("[STEP 7] Navigating to My Page Address Book...")
        page.goto(f"{abs_path}?view=addresses")
        page.wait_for_timeout(400)

        dom_cards = page.evaluate("""() => {
            const cards = Array.from(document.querySelectorAll('.address-card'));
            return cards.map(c => ({
                id: c.getAttribute('data-addr-id'),
                text: c.innerText
            }));
        }""")
        print(f"[STEP 8] Address cards rendered in DOM: {len(dom_cards)}")
        assert len(dom_cards) == 3, f"Expected 3 address cards in DOM, got {len(dom_cards)}"

        card_with_heo = next((c for c in dom_cards if "허준" in c["text"]), None)
        assert card_with_heo is not None, f"Card with '허준' not found in DOM cards: {dom_cards}"

        print("\n[SUCCESS] Checkout state clobber test PASSED with 100% empirical evidence!")
        browser.close()

if __name__ == "__main__":
    test_checkout_state_clobber()
