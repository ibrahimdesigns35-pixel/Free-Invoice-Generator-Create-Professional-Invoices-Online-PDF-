document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let state = {
        invoiceID: '',
        currencyCode: 'USD',
        currencySymbol: '$',
        isGSTMode: false,
        taxRate: 0,
        discountRate: 0
    };

    // --- CACHE DOM ELEMENTS ---
    const invoiceForm = document.getElementById('invoiceForm');
    const itemsContainer = document.getElementById('itemsContainer');

    // Config Inputs
    const currencySelect = document.getElementById('currencySelect');
    const gstToggle = document.getElementById('gstToggle');
    const templateSelect = document.getElementById('templateSelect');

    // Form Inputs
    const paymentTermsInput = document.getElementById('paymentTermsInput');
    const invoiceDateInput = document.getElementById('invoiceDateInput');
    const dueDateInput = document.getElementById('dueDateInput');

    // Notes & Sig Inputs
    const notesInput = document.getElementById('notesInput');
    const termsInput = document.getElementById('termsInput');
    const signatureInput = document.getElementById('signatureInput');

    // GST Specific Inputs
    const businessStateInput = document.getElementById('businessStateInput');
    const clientStateInput = document.getElementById('clientStateInput');

    // Preview Containers
    const invoicePreview = document.getElementById('invoicePreview');
    const itemsPreviewBody = document.getElementById('itemsPreviewBody');

    // --- INIT ---
    init();

    function init() {
        // Load settings from localStorage? For now just defaults or re-gen ID
        generateInvoiceID();
        initDateDefaults();
        // Add one empty item row by default
        addItemRow();

        // Listeners
        setupEventListeners();
    }

    function setupEventListeners() {
        // Top Buttons
        document.getElementById('addItemBtn').addEventListener('click', addItemRow);
        document.getElementById('newInvoiceBtn').addEventListener('click', handleNewInvoice);
        document.getElementById('downloadPdfBtn').addEventListener('click', handleDownloadPDF);
        document.getElementById('logoInput').addEventListener('change', handleLogoUpload);
        signatureInput.addEventListener('change', handleSignatureUpload);

        // Config Listeners
        currencySelect.addEventListener('change', updateCurrency);
        gstToggle.addEventListener('change', updateGSTMode);
        templateSelect.addEventListener('change', updateTemplate);

        // Input Listeners for Text/Dates
        const previewMap = {
            'businessNameInput': 'businessNamePreview',
            'clientNameInput': 'clientNamePreview',
            'invoiceIdInput': 'invoiceIdPreview',
            'notesInput': 'notesPreview',
            'termsInput': 'termsPreview',
            // GST fields
            'businessGstInput': 'businessGstPreview',
            'clientGstInput': 'clientGstPreview'
        };

        for (const [inputId, previewId] of Object.entries(previewMap)) {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', (e) => {
                    const el = document.getElementById(previewId);
                    if (el) {
                        if (inputId.includes('Gst')) {
                            el.textContent = e.target.value ? `GSTIN: ${e.target.value}` : '';
                            el.classList.toggle('d-none', !e.target.value);
                        } else if (inputId === 'notesInput' || inputId === 'termsInput') {
                            el.innerText = e.target.value; // use innerText to preserve line breaks if using css white-space
                            const val = e.target.value.trim();

                            // Toggle Section visibility
                            if (inputId === 'notesInput') {
                                document.getElementById('notesSection').classList.toggle('d-none', !val);
                            } else {
                                document.getElementById('termsSection').classList.toggle('d-none', !val);
                            }

                            // Toggle Main Container visibility
                            const hasNotes = document.getElementById('notesInput').value.trim().length > 0;
                            const hasTerms = document.getElementById('termsInput').value.trim().length > 0;
                            document.getElementById('notesTermsContainer').classList.toggle('d-none', !(hasNotes || hasTerms));

                        } else {
                            el.textContent = e.target.value;
                        }
                    }
                });

                // Trigger input event to set initial state (hiding placeholders)
                // Actually, let's clear placeholders on init or just trigger now if values empty
                if ((inputId === 'notesInput' || inputId === 'termsInput') && !input.value) {
                    // Since we might have default placeholders in HTML, we should essentially force them hidden if empty
                    // But wait, the previous code had default text in the P tags? 
                    // The user wants: "If Notes or Terms are empty: Hide that section automatically".
                    // So we should adhere to the Input value.
                }
            }
        }

        // Complex text listeners
        ['businessAddressInput', 'businessEmailInput', 'businessPhoneInput'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => updateCombinedDetails('business'));
        });
        ['clientAddressInput', 'clientEmailInput'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => updateCombinedDetails('client'));
        });

        // Date & Terms
        invoiceDateInput.addEventListener('change', (e) => {
            updateDatePreview('invoiceDatePreview', e.target.value);
            updateDueDate();
        });
        paymentTermsInput.addEventListener('change', updateDueDate);

        // Calculation triggers
        document.getElementById('taxRateInput').addEventListener('input', calculateTotals);
        document.getElementById('discountRateInput').addEventListener('input', calculateTotals);

        // State triggers
        businessStateInput.addEventListener('change', calculateTotals);
        clientStateInput.addEventListener('change', calculateTotals);
    }

    // --- CORE LOGIC ---

    function generateInvoiceID(forceNew = false) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

        let lastNumber = localStorage.getItem('lastInvoiceNumber');

        if (!lastNumber || forceNew) {
            lastNumber = lastNumber ? parseInt(lastNumber) + 1 : 1;
        } else {
            lastNumber = parseInt(lastNumber) + 1;
        }

        localStorage.setItem('lastInvoiceNumber', lastNumber);

        const seq = String(lastNumber).padStart(4, '0');
        state.invoiceID = `INV-${dateStr}-${seq}`;

        document.getElementById('invoiceIdPreview').textContent = state.invoiceID;
        document.getElementById('invoiceIdInput').value = state.invoiceID;
    }

    function initDateDefaults() {
        const today = new Date();
        invoiceDateInput.valueAsDate = today;
        updateDueDate(); // sets due date based on terms
        updateDatePreview('invoiceDatePreview', invoiceDateInput.value);
    }

    function updateDueDate() {
        const dateVal = invoiceDateInput.valueAsDate;
        if (!dateVal) return;

        const terms = parseInt(paymentTermsInput.value) || 0;
        const due = new Date(dateVal);
        due.setDate(due.getDate() + terms);

        dueDateInput.valueAsDate = due;
        updateDatePreview('dueDatePreview', dueDateInput.value);
    }

    function updateTemplate() {
        const tmpl = templateSelect.value;
        const container = document.getElementById('invoicePreview');

        // Clean classes
        container.classList.remove('invoice-classic', 'invoice-modern', 'invoice-minimal');

        // Add specific class (css can be added later, or just minimal structure changes)
        // For now, let's just use it to toggle some Bootstrap classes if we wanted, 
        // or assumes style.css handles .invoice-modern
        container.classList.add(`invoice-${tmpl}`);
    }

    function updateCurrency() {
        const opt = currencySelect.selectedOptions[0];
        state.currencyCode = currencySelect.value;
        state.currencySymbol = opt.getAttribute('data-symbol');
        calculateTotals();
    }

    function updateGSTMode() {
        state.isGSTMode = gstToggle.checked;
        const gstFields = document.querySelectorAll('.gst-fields');
        gstFields.forEach(el => el.classList.toggle('d-none', !state.isGSTMode));

        // Update label
        document.querySelector('label[for="taxRateInput"]').textContent = state.isGSTMode ? "GST Rate (%)" : "Tax (%)";

        calculateTotals();
    }

    function handleNewInvoice() {
        if (confirm('Start a new invoice?')) {
            invoiceForm.reset();
            itemsContainer.innerHTML = '';
            addItemRow();
            initDateDefaults();
            generateInvoiceID(true);

            // Clear Media
            document.getElementById('logoPreview').src = '';
            document.getElementById('logoPreview').classList.add('d-none');
            document.getElementById('signaturePreview').src = '';
            document.getElementById('signaturePreviewContainer').classList.add('d-none');

            // Re-trigger defaults
            updateCurrency();
            updateGSTMode();
            calculateTotals();

            // Reset Text
            ['businessNamePreview', 'clientNamePreview'].forEach(id => document.getElementById(id).textContent = id.replace(/Preview|Name/g, '') === 'business' ? 'Your Business' : 'Client Name');
            ['businessDetailsPreview', 'clientDetailsPreview', 'businessGstPreview', 'clientGstPreview'].forEach(id => document.getElementById(id).innerHTML = '');
        }
    }

    // --- DOM ---

    function addItemRow() {
        const id = Date.now();
        const row = document.createElement('div');
        row.className = 'row g-2 mb-2 item-row align-items-end';
        row.dataset.id = id;

        row.innerHTML = `
            <div class="col-6">
                <input type="text" class="form-control item-name" placeholder="Item Name / Description">
            </div>
            <div class="col-2">
                <input type="number" class="form-control item-qty" placeholder="Qty" value="1" min="1">
            </div>
            <div class="col-3">
                <input type="number" class="form-control item-price" placeholder="Price" value="0" min="0" step="0.01">
            </div>
            <div class="col-1 text-end">
                <button type="button" class="btn btn-outline-danger btn-sm remove-item" tabindex="-1"><i class="bi bi-trash"></i></button>
            </div>
        `;

        itemsContainer.appendChild(row);

        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', calculateTotals);
        });

        row.querySelector('.remove-item').addEventListener('click', () => {
            if (itemsContainer.children.length > 1) {
                row.remove();
                calculateTotals();
            } else {
                row.querySelectorAll('input').forEach(i => i.value = i.classList.contains('item-qty') ? 1 : '');
                calculateTotals();
            }
        });

        calculateTotals(); // re-calc to zero if needed
    }

    // --- UPDATERS ---

    function updateCombinedDetails(type) {
        const address = document.getElementById(type + 'AddressInput').value;
        const email = document.getElementById(type + 'EmailInput').value;
        const phone = document.getElementById(type + 'PhoneInput') ? document.getElementById(type + 'PhoneInput').value : '';

        let html = '';
        if (address) html += `<div>${address.replace(/\n/g, '<br>')}</div>`;
        if (email) html += `<div>${email}</div>`;
        if (phone) html += `<div>${phone}</div>`;

        document.getElementById(type + 'DetailsPreview').innerHTML = html;
    }

    function updateDatePreview(id, val) {
        if (val) {
            const dateObj = new Date(val);
            document.getElementById(id).textContent = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } else {
            document.getElementById(id).textContent = '';
        }
    }

    function calculateTotals() {
        // Gather Items
        const rows = document.querySelectorAll('.item-row');
        let subtotal = 0;
        let itemsHtml = '';

        rows.forEach(row => {
            const name = row.querySelector('.item-name').value;
            const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const total = qty * price;

            subtotal += total;

            if (name || total > 0) {
                itemsHtml += `
                    <tr>
                        <td class="ps-0 text-dark fw-bold">${name || 'Item'}</td>
                        <td class="text-end text-muted">${qty}</td>
                        <td class="text-end text-muted">${formatCurrency(price)}</td>
                        <td class="text-end fw-medium">${formatCurrency(total)}</td>
                    </tr>
                `;
            }
        });

        itemsPreviewBody.innerHTML = itemsHtml;

        // Taxes logic
        const taxRate = parseFloat(document.getElementById('taxRateInput').value) || 0;
        const discountRate = parseFloat(document.getElementById('discountRateInput').value) || 0;

        let taxAmount = subtotal * (taxRate / 100);
        let discountAmount = subtotal * (discountRate / 100);

        // GST Logic
        let cgst = 0, sgst = 0, igst = 0;
        const showTaxRow = !state.isGSTMode && taxRate > 0;
        const showGSTRows = state.isGSTMode && taxRate > 0;

        if (state.isGSTMode) {
            const bState = businessStateInput.value;
            const cState = clientStateInput.value;

            if (bState && cState) {
                if (bState === cState) {
                    // Intra-state: CGST + SGST (Split taxAmout by 2)
                    cgst = taxAmount / 2;
                    sgst = taxAmount / 2;
                } else {
                    // Inter-state: IGST
                    igst = taxAmount;
                }
            } else {
                // Default to IGST or nothing? Let's default to IGST if states unknown or treat as single tax?
                // For simplicity, let's treat as IGST if one is missing, OR show nothing.
                // Revert to showing IGST as full tax for now to ensure visibility.
                igst = taxAmount;
            }
        }

        // Update DOM
        document.getElementById('subtotalPreview').textContent = formatCurrency(subtotal);

        // Standard Tax
        const taxRow = document.getElementById('taxRow');
        taxRow.classList.toggle('d-none', !showTaxRow);
        document.getElementById('taxRatePreview').textContent = taxRate;
        document.getElementById('taxAmountPreview').textContent = formatCurrency(taxAmount);

        // GST Rows
        document.getElementById('cgstRow').classList.toggle('d-none', !(showGSTRows && cgst > 0));
        document.getElementById('sgstRow').classList.toggle('d-none', !(showGSTRows && sgst > 0));
        document.getElementById('igstRow').classList.toggle('d-none', !(showGSTRows && igst > 0)); // Show IGST if > 0 or if likely default

        document.getElementById('cgstRatePreview').textContent = taxRate / 2;
        document.getElementById('cgstAmountPreview').textContent = formatCurrency(cgst);
        document.getElementById('sgstRatePreview').textContent = taxRate / 2;
        document.getElementById('sgstAmountPreview').textContent = formatCurrency(sgst);
        document.getElementById('igstRatePreview').textContent = taxRate;
        document.getElementById('igstAmountPreview').textContent = formatCurrency(igst);

        // Discount
        const discountRow = document.getElementById('discountRow');
        discountRow.classList.toggle('d-none', discountRate <= 0);
        document.getElementById('discountRatePreview').textContent = discountRate;
        document.getElementById('discountAmountPreview').textContent = '-' + formatCurrency(discountAmount);

        const grandTotal = subtotal + taxAmount - discountAmount;
        document.getElementById('grandTotalPreview').textContent = formatCurrency(grandTotal);
    }

    // --- UTILS ---

    function handleLogoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = document.getElementById('logoPreview');
                img.src = e.target.result;
                img.classList.remove('d-none');
            }
            reader.readAsDataURL(file);
        }
    }

    function handleSignatureUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = document.getElementById('signaturePreview');
                img.src = e.target.result;
                document.getElementById('signaturePreviewContainer').classList.remove('d-none');
            }
            reader.readAsDataURL(file);
        }
    }

    function handleDownloadPDF() {
        // VALIDATION
        const rows = document.querySelectorAll('.item-row');
        let isValid = true;
        let message = '';

        if (rows.length === 0) {
            isValid = false;
            message = 'Please add at least one item to the invoice.';
        } else {
            rows.forEach(row => {
                const name = row.querySelector('.item-name').value.trim();
                const price = parseFloat(row.querySelector('.item-price').value);

                if (!name) {
                    isValid = false;
                    message = 'All items must have a description.';
                }
                if (price <= 0 && isValid) { // only update msg if not already set
                    // Allow zero price? Maybe for free items. Let's strict check name only for now, warning on zero total.
                    // User req said: "Prevent empty or zero-value items"
                    isValid = false;
                    message = 'Items cannot have a price of zero.';
                }
            });
        }

        if (!isValid) {
            showToast(message, 'danger');
            return;
        }

        const element = document.getElementById('invoicePreview');
        const opt = {
            margin: 0,
            filename: `${state.invoiceID}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Show loading state
        const btn = document.getElementById('downloadPdfBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating...';
        btn.disabled = true;

        html2pdf().set(opt).from(element).save().then(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            showToast('Invoice downloaded successfully!', 'success');
        }).catch(err => {
            console.error(err);
            btn.innerHTML = originalText;
            btn.disabled = false;
            showToast('Error generating PDF. Please try again.', 'danger');
        });
    }

    function showToast(message, type = 'primary') {
        // Create Toast Container if not exists
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999;';
            document.body.appendChild(container);
        }

        // Create Toast
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0 show`;
        toast.role = 'alert';
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    function formatCurrency(num) {
        return state.currencySymbol + num.toFixed(2);
    }

});
