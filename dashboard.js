// dashboard.js: Fetch and display the logged-in user's username
const SUPABASE_URL = 'https://ygfjhicakkcctduoscdy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZmpoaWNha2tjY3RkdW9zY2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MDgzMDQsImV4cCI6MjA2MDQ4NDMwNH0.pjDlkmoNMpJGxf7viom2hNgWTVEUUz7yYWgMUAaCx8c';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let latestReceipts = [];
let latestReceiptsError = null;

async function loadDashboard() {
    const greetingEl = document.getElementById('dashboard-greeting');
    const totalSpentEl = document.getElementById('total-spent');
    const totalWarrantyEl = document.getElementById('total-warranty');
    const receiptListEl = document.getElementById('receipt-list');

    // Get session/user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        greetingEl.textContent = 'Hi!';
        receiptListEl.innerHTML = '<div class="receipt-loading">Please log in to view receipts.</div>';
        return;
    }
    // Fetch profile for greeting and get phone number
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('username, phone')
        .eq('id', user.id)
        .limit(1);
    let phone = null;
    if (profiles && profiles.length > 0) {
        const username = profiles[0].username;
        greetingEl.textContent = `Hi, ${username}!`;
        
        // Update bottom navigation with first name
        const profileNavName = document.getElementById('profile-nav-name');
        if (profileNavName) {
            const firstName = username.split(' ')[0]; // Get first name only
            profileNavName.textContent = firstName.length > 8 ? firstName.substring(0, 8) + '..' : firstName;
        }
        phone = profiles[0].phone;
    } else {
        greetingEl.textContent = 'Hi!';
    }
    if (!phone) {
        receiptListEl.innerHTML = '<div class="receipt-loading">No receipts found.</div>';
        totalSpentEl.textContent = '₹0';
        totalWarrantyEl.textContent = '0 months';
        return;
    }
    // Find customer by phone number
    const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone)
        .limit(1);
    if (customerError || !customers || customers.length === 0) {
        receiptListEl.innerHTML = '<div class="receipt-loading">No receipts found.</div>';
        totalSpentEl.textContent = '₹0';
        totalWarrantyEl.textContent = '0 months';
        return;
    }
    const customerId = customers[0].id;

    // Fetch receipts for this customer
    const { data: receipts, error: receiptsError } = await supabase
        .from('receipts')
        .select('*')
        .eq('customer_id', customerId)
        .limit(10);

    latestReceipts = receipts || [];
    latestReceiptsError = receiptsError;

    if (receiptsError) {
        receiptListEl.innerHTML = ''; // Clear the receipt list
        totalSpentEl.textContent = '₹0';
        totalWarrantyEl.textContent = '0 months';
        return;
    }

    // Calculate total spent and max warranty
    let totalSpent = 0;
    let maxWarranty = 0;
    receipts.forEach(r => {
        totalSpent += Number(r.amount || 0);
        if (r.warranty_months && Number(r.warranty_months) > maxWarranty) {
            maxWarranty = Number(r.warranty_months);
        }
    });
    totalSpentEl.textContent = `₹${totalSpent}`;
    totalWarrantyEl.textContent = maxWarranty > 0 ? `${maxWarranty} months` : '0 months';

    // Show receipts in a table format
    if (!receipts || receipts.length === 0) {
        receiptListEl.innerHTML = '<div class="receipt-loading">No receipts found.</div>';
    } else {
        // Store receipts globally for download functionality
        window.receiptsData = receipts;
        // Store receipts globally for download functionality
        window.receiptsData = receipts;
        // Create table structure
        receiptListEl.innerHTML = `
            <div class="receipts-table">
                <div class="receipts-header">
                    <div>Date</div>
                    <div>Customer</div>
                    <div>Product</div>
                    <div>Amount</div>
                    <div>Warranty</div>
                    <div>Actions</div>
                </div>
                ${receipts.map(r => `
                    <div class="receipt-row">
                        <div>${r.date ? new Date(r.date).toLocaleDateString() : '-'}</div>
                        <div>${r.customer_name || '-'}</div>
                        <div>${r.product_Name || r.product_name || '-'}</div>
                        <div>₹${r.amount_paid || '0.00'}</div>
                        <div>${r.warranty ? `${r.warranty} months` : '-'}</div>
                        <div class="receipt-actions">
                            ${r.pdf_url ? 
                                `<a href="${r.pdf_url}" target="_blank" class="pdf-link">View</a>
                                <a href="${r.pdf_url}" download class="pdf-link">Download</a>` : 
                                '<span style="color:#888;">No PDF</span>'}
                        </div>
                    </div>
                `).join('')}
            </div>
            <style>
                .receipts-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                    font-size: 14px;
                }
                .receipts-header {
                    display: grid;
                    grid-template-columns: 1fr 1fr 2fr 1fr 1fr 1fr;
                    background-color: #f5f5f5;
                    padding: 10px;
                    font-weight: bold;
                    border-bottom: 2px solid #ddd;
                }
                .receipt-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr 2fr 1fr 1fr 1fr;
                    padding: 12px 10px;
                    border-bottom: 1px solid #eee;
                    align-items: center;
                }
                .receipt-row:hover {
                    background-color: #f9f9f9;
                }
                .receipt-actions {
                    display: flex;
                    gap: 10px;
                }
                .pdf-link {
                    color: #2563eb;
                    text-decoration: none;
                }
                .pdf-link:hover {
                    text-decoration: underline;
                }
                @media (max-width: 768px) {
                    .receipts-header, .receipt-row {
                        grid-template-columns: 1fr 1fr 1fr;
                    }
                    .receipts-header div:nth-child(n+4),
                    .receipt-row div:nth-child(n+4) {
                        display: none;
                    }
                }
            </style>
        `;
    }
}

// --- PDF Export Logic ---
// Global variable to store profile HTML content
let profileHtmlContent = '';

// Function to open profile modal
function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    const content = document.getElementById('profile-modal-content');
    
    // Show loading state
    content.innerHTML = `
        <div style="text-align:center;padding:20px 0;">
            <div class="loader" style="border:4px solid #f3f3f3;border-top:4px solid #2e7d32;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>
            <p>Loading profile...</p>
        </div>`;
    
    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Load profile content
    loadProfileContent();
}

// Function to close profile modal
function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Function to load profile content
async function loadProfileContent() {
    try {
        // Fetch the profile page content
        const response = await fetch('profile.html');
        const html = await response.text();
        
        // Create a temporary div to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Extract the profile container content
        const profileContainer = tempDiv.querySelector('.container');
        if (profileContainer) {
            // Store the HTML content for future use
            profileHtmlContent = profileContainer.innerHTML;
            
            // Update the modal content
            const content = document.getElementById('profile-modal-content');
            content.innerHTML = `
                <div class="profile-container" style="padding:10px;">
                    ${profileHtmlContent}
                </div>`;
            
            // Initialize any scripts in the profile content
            initializeProfileScripts();
        } else {
            throw new Error('Profile content not found');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        const content = document.getElementById('profile-modal-content');
        content.innerHTML = `
            <div style="text-align:center;padding:20px;color:#d32f2f;">
                <span class="material-icons" style="font-size:48px;color:#d32f2f;">error_outline</span>
                <h3>Error Loading Profile</h3>
                <p>Could not load profile information. Please try again later.</p>
                <button onclick="loadProfileContent()" style="margin-top:15px;padding:8px 16px;background:#2e7d32;color:white;border:none;border-radius:4px;cursor:pointer;">
                    Retry
                </button>
            </div>`;
    }

}

// Function to initialize scripts in the profile content
function initializeProfileScripts() {
    // This function will be called after profile content is loaded
    // Add any script initialization code here if needed
}

document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
    loadReceiptsTable();
    setupReceiptsModal();
    
    // Add event listener for profile modal close button
    const closeProfileBtn = document.getElementById('close-profile-modal');
    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', closeProfileModal);
    }
    
    // Ensure navigation links work properly
    document.querySelectorAll('nav.bottom-nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            // Remove active class from all nav items
            document.querySelectorAll('nav.bottom-nav a').forEach(item => {
                item.classList.remove('active');
            });
            // Add active class to clicked item
            this.classList.add('active');
        });
    });

    // PDF export logic (inside modal)
    const downloadBtn = document.getElementById('download-pdf-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async function() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
            // Fetch logged-in user's profile
            let userProfile = { username: '', phone: '', email: '' };
            let userId = null;
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    userId = user.id;
                    const { data: profiles } = await supabase.from('profiles').select('username, phone, email').eq('id', user.id).limit(1);
                    if (profiles && profiles.length > 0) {
                        userProfile = {
                            username: profiles[0].username || '',
                            phone: profiles[0].phone || '',
                            email: profiles[0].email || ''
                        };
                    }
                }
            } catch (e) { /* ignore */ }
            // Fetch products for this user (not used for company info)
            let userProducts = [];
            if (userId) {
                try {
                    const { data: products, error: productsError } = await supabase
                        .from('products')
                        .select('*')
                        .eq('user_code', userId);
                    if (productsError) {
                        console.warn('[DEBUG] Error fetching products:', productsError);
                    }
                    if (products) {
                        userProducts = products;
                    }
                } catch (e) { console.warn('[DEBUG] Exception fetching products', e); }
            }
            // Set default business info
            let businessInfo = {
                business_name: 'Your Business Name',
                gst_number: 'GSTNUMBER',
                business_address: 'Your Business Address',
                logo_url: '' // Optional: Add a default logo URL if needed
            };
            // Try to fetch business info, but don't fail if the table doesn't exist
            try {
                const { data: biz, error } = await supabase
                    .from('business_info')
                    .select('business_name, gst_number, logo_url, business_address')
                    .limit(1);
                if (!error && biz && biz.length > 0) {
                    businessInfo = {
                        ...businessInfo, // Keep defaults as fallback
                        ...biz[0]        // Override with any existing values
                    };
                }
            } catch (e) {
                console.warn('Could not fetch business info, using defaults:', e.message);
            }
            const tableBody = document.querySelector('#receipts-table tbody');
            let receipts = [];
            if (tableBody) {
                receipts = Array.from(tableBody.querySelectorAll('tr')).map(tr => {
                    const tds = tr.querySelectorAll('td');
                    return {
                        customer_name: tds[0]?.innerText || '',
                        product_Name: tds[1]?.innerText || '',
                        amount_paid: tds[2]?.innerText || '',
                        amount_remaining: tds[3]?.innerText || '',
                        warranty: tds[4]?.innerText || '',
                        return_period: tds[5]?.innerText || '',
                        date: tds[6]?.innerText || '',
                        user_code: tds[7]?.innerText || '' // Make sure user_code is available
                    };
                });
            }
            if (!receipts || receipts.length === 0) {
                doc.text('No receipts found.', 20, 30);
            } else {
                // Fetch all company info in parallel
                const companyInfos = await Promise.all(receipts.map(async (r) => {
                    let companyInfo = { name: '-', email: '-', address: '-' };
                    if (r.user_code) {
                        try {
                            const { data: users, error: userError } = await supabase
                                .from('users')
                                .select('name, email, address')
                                .eq('user_code', r.user_code)
                                .limit(1);
                            if (!userError && users && users.length > 0) {
                                companyInfo = {
                                    name: users[0].name || '-',
                                    email: users[0].email || '-',
                                    address: users[0].address || '-'
                                };
                            }
                        } catch (e) { /* ignore */ }
                    }
                    return companyInfo;
                }));
                // Now generate the PDF with all company info
                receipts.forEach((r, idx) => {
                    let y = 18;
                    const companyInfo = companyInfos[idx];
                    let productName = r.product_Name || '-';
                    let companyName = '-'; // Default company name
                    
                    // If we have userProducts (fetched earlier), try to find the matching product
                    if (userProducts && userProducts.length > 0) {
                        const matchingProduct = userProducts.find(p => 
                            p.product_Name === productName || p.id === r.product_id
                        );
                        if (matchingProduct && matchingProduct.companyName) {
                            companyName = matchingProduct.companyName;
                        }
                    }
                    
                    if (productName === '-' && r.product_name) {
                        productName = r.product_name;
                    }
                    if (businessInfo.logo_url) {
                        const img = new window.Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = function() {
                            doc.addImage(img, 'PNG', 22, y, 18, 18);
                        };
                        img.src = businessInfo.logo_url;
                        doc.setDrawColor(180, 180, 180);
                        doc.rect(22, y, 18, 18);
                    }
                    doc.setFontSize(16);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(37, 100, 39);
                    // Use company name from product if available, otherwise from company info
                    const displayCompanyName = companyName !== '-' ? companyName : (companyInfo.name || 'Company Name');
                    doc.text(displayCompanyName, 45, y + 7);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(60, 60, 60);
                    doc.text((companyInfo.address || 'Company Address'), 45, y + 13);
                    doc.text('Email: ' + (companyInfo.email || '-'), 45, y + 18);
                    if (businessInfo.gst_number) {
                        doc.text('GST: ' + businessInfo.gst_number, 45, y + 23);
                    }
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(120,120,120);
                    doc.text('Terms & Conditions apply.', 45, y + 27);
                    doc.setTextColor(0, 0, 0);
                    y += 33;
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Customer Details:', 28, y);
                    y += 7;
                    doc.setFont('helvetica', 'normal');
                    doc.text('Name: ' + (userProfile.username || ''), 32, y);
                    y += 6;
                    doc.text('Phone: ' + (userProfile.phone || ''), 32, y);
                    y += 6;
                    doc.text('Email: ' + (userProfile.email || ''), 32, y);
                    y += 8;
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text('RECEIPT / BILL', 75, y);
                    y += 7;
                    doc.setDrawColor(37, 100, 39);
                    doc.line(20, y, 150, y);
                    y += 8;
                    const formatField = (value) => value || '-';
                    const formatPrice = (amount) => {
                        if ((amount === null || amount === undefined || amount === '') && amount !== 0) return '-';
                        let cleanAmount = String(amount).trim();
                        cleanAmount = cleanAmount.replace(/[^0-9.]/g, '');
                        const parts = cleanAmount.split('.');
                        if (parts.length > 1) {
                            cleanAmount = parts[0] + '.' + parts.slice(1).join('');
                        }
                        return cleanAmount ? `₹${cleanAmount}` : '-';
                    };
                    const formatWarranty = (months) => {
                        if (!months) return '-';
                        const monthsNum = String(months).replace(/[^0-9.]/g, '').trim();
                        return monthsNum ? `${monthsNum} months` : '-';
                    };
                    const fields = [
                        ['Customer Name', formatField(r.customer_name)],
                        ['Product Name', formatField(productName)],
                        ['Amount Paid', formatPrice(r.amount_paid)],
                        ['Amount Remaining', formatPrice(r.amount_remaining)],
                        ['Warranty', formatWarranty(r.warranty)],
                        ['Return Period', formatField(r.return_period)],
                        ['Date', formatField(r.date ? r.date.split('T')[0] : '')]
                    ];
                    fields.forEach(([label, value]) => {
                        doc.setFont('helvetica', 'bold');
                        doc.text(label + ':', 28, y);
                        doc.setFont('helvetica', 'normal');
                        doc.text(value, 70, y);
                        y += 9;
                    });
                    y += 2;
                    doc.setDrawColor(200, 200, 200);
                    doc.line(20, y, 150, y);
                    y += 10;
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'italic');
                    doc.text('Thank you for your purchase!', 55, y);
                    if (idx < receipts.length - 1) doc.addPage();
                });
            }
            const pdfData = doc.output('bloburl');
            const previewContainer = document.getElementById('pdf-preview-container');
            if (previewContainer) {
                previewContainer.innerHTML = `<iframe src="${pdfData}" width="100%" height="400px" style="border:1px solid #ccc;"></iframe>`;
            }
            doc.save('receipts.pdf');
        });
    }
});


// Dynamically populate receipts table from Supabase
async function loadReceiptsTable() {
    // For modal table
    const tableBody = document.querySelector('#receipts-table tbody');
    // For summary UI
    const statusDiv = document.getElementById('receipts-status');
    const openModalBtn = document.getElementById('open-receipts-modal-btn');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    if (statusDiv) statusDiv.textContent = 'Checking receipts...';
    if (openModalBtn) openModalBtn.style.display = 'none';

    // Get logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="5">Please log in to view receipts.</td></tr>';
        if (statusDiv) statusDiv.textContent = 'Please log in to view receipts.';
        return;
    }
    // Get username from profile
    const { data: profiles } = await supabase.from('profiles').select('username').eq('id', user.id).limit(1);
    if (!profiles || profiles.length === 0 || !profiles[0].username) {
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="5">No receipts found.</td></tr>';
        if (statusDiv) statusDiv.textContent = 'No receipts found.';
        return;
    }
    const username = profiles[0].username;
    // Fetch receipts by customer_name (username)
    let receipts = [], error = null;
    try {
        // First try with ordering
        let { data, error: queryError } = await supabase
            .from('receipts')
            .select('*')
            .eq('customer_name', username)
            .order('created_at', { ascending: false });
            
        if (queryError) {
            console.warn('[DEBUG] Error with ordered query, trying without order:', queryError);
            // Retry without ordering
            const retry = await supabase
                .from('receipts')
                .select('*')
                .eq('customer_name', username);
            data = retry.data;
            queryError = retry.error;
        }
        
        receipts = data || [];
        error = queryError;
    } catch (e) {
        console.error('[DEBUG] Exception fetching receipts:', e);
        error = e;
    }
    if (error) {
        console.error('[DEBUG] Error loading receipts:', error);
    } else if (window && window.console) {
        console.log('[DEBUG] Receipts found:', receipts);
    }
    
    if (error || !receipts || receipts.length === 0) {
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="5">No receipts found.</td></tr>';
        if (statusDiv) statusDiv.textContent = 'No receipts found.';
        return;
    }
    // Fetch products for this user
    let userProducts = [];
    try {
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('user_code', user.id);
        if (productsError) {
            console.warn('[DEBUG] Error fetching products:', productsError);
        }
        if (products) {
            userProducts = products;
        }
    } catch (e) { console.warn('[DEBUG] Exception fetching products', e); }
    // Show summary and enable modal button
    if (statusDiv) statusDiv.textContent = `You have ${receipts.length} receipt${receipts.length > 1 ? 's' : ''}.`;
    if (openModalBtn) openModalBtn.style.display = 'inline-block';
    // Populate modal table
    if (tableBody) {
        console.log('[DEBUG] All receipts data:', receipts);
        console.log('[DEBUG] User products:', userProducts);
        
        tableBody.innerHTML = receipts.map((r, index) => {
            console.log(`[DEBUG] Processing receipt ${index}:`, r);
            
            // Parse product names from products JSON or use product_Name
            let productName = '-';
            try {
                // First try to get from userProducts
                const matchedProduct = userProducts.find(p => 
                    (p.productName && p.productName === r.product_Name) || 
                    (p.product_Name && p.product_Name === r.product_Name) ||
                    (p.id && p.id === r.product_id)
                );
                
                if (matchedProduct) {
                    productName = matchedProduct.productName || matchedProduct.product_Name || '-';
                } 
                // If no match, try to parse from products JSON
                else if (r.products) {
                    const productsArr = typeof r.products === 'string' ? JSON.parse(r.products) : r.products;
                    if (Array.isArray(productsArr) && productsArr.length > 0) {
                        productName = productsArr.map(p => p.name || p.productName || '-').join(', ');
                    }
                }
                // Fall back to product_Name if available
                else if (r.product_Name) {
                    productName = r.product_Name;
                }
            } catch (e) { 
                console.error(`[DEBUG] Error processing products for receipt ${index}:`, e);
                productName = '-';
            }
            // Format fields with proper handling
            const formatField = (value) => value || '-';
            const formatPrice = (amount) => {
                if ((amount === null || amount === undefined || amount === '') && amount !== 0) {
                    return '-';
                }
                try {
                    let numberValue = parseFloat(amount);
                    if (isNaN(numberValue)) {
                        const cleanString = String(amount).replace(/[^0-9.]/g, '');
                        numberValue = parseFloat(cleanString);
                        if (isNaN(numberValue)) {
                            return '-';
                        }
                    }
                    const formattedValue = numberValue.toFixed(2);
                    return `₹${formattedValue}`;
                } catch (error) {
                    return '-';
                }
            };
            const formatWarranty = (months) => {
                if (!months) return '-';
                const monthsNum = String(months).replace(/[^0-9.]/g, '').trim();
                return monthsNum ? `${monthsNum} months` : '-';
            };
            const pricePaid = formatPrice(r.amount_paid);
            const priceRemaining = formatPrice(r.amount_remaining);
            const row = document.createElement('tr');
            const createCell = (content) => {
                const cell = document.createElement('td');
                cell.textContent = content;
                return cell;
            };
            // Safely access receipt fields with fallbacks
            try {
                row.appendChild(createCell(formatField(r.customer_name || r.customerName || '-')));
                row.appendChild(createCell(productName));
                row.appendChild(createCell(pricePaid));
                row.appendChild(createCell(priceRemaining));
                row.appendChild(createCell(formatWarranty(r.warranty)));
                row.appendChild(createCell(formatField(r.return_period || r.returnPeriod || '-')));
                row.appendChild(createCell(r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0]) : '-'));
            } catch (e) {
                console.error(`[DEBUG] Error creating row for receipt ${index}:`, e);
                // Add error indicator to help with debugging
                const errorCell = document.createElement('td');
                errorCell.colSpan = 7;
                errorCell.textContent = `Error loading receipt: ${e.message}`;
                errorCell.style.color = 'red';
                row.appendChild(errorCell);
            }
            return row.outerHTML;
        }).join('');
    }
}

// Modal open/close logic
function setupReceiptsModal() {
    const modal = document.getElementById('receipts-modal');
    const openBtn = document.getElementById('open-receipts-modal-btn');
    const closeBtn = document.getElementById('close-receipts-modal-btn');
    if (!modal || !openBtn || !closeBtn) return;
    openBtn.onclick = () => { modal.style.display = 'flex'; };
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
}

// Close modal when clicking outside the content
window.addEventListener('click', function(event) {
    const modal = document.getElementById('profile-modal');
    const modalContent = modal ? modal.querySelector('.modal-content') : null;
    
    if (event.target === modal) {
        closeProfileModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('profile-modal');
        if (modal && window.getComputedStyle(modal).display === 'flex') {
            closeProfileModal();
        }
    }
});

// Optionally, load jsPDF autotable if not already loaded
(function() {
    if (!window.jspdf || window.jspdf && !window.jspdf.jsPDF) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.0/jspdf.plugin.autotable.min.js';
    script.onload = function() {
        console.log('jsPDF AutoTable plugin loaded');
    };
    script.onerror = function() {
        console.error('Failed to load jsPDF AutoTable plugin');
    };
    document.head.appendChild(script);
})();

// Function to download receipt as PDF
async function downloadReceiptAsPdf(receipt) {
    try {
        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(20);
        doc.text('Receipt', 105, 20, { align: 'center' });
        
        // Add receipt details
        doc.setFontSize(12);
        let y = 40;
        
        // Receipt ID and Date
        doc.text(`Receipt ID: ${receipt.id || 'N/A'}`, 20, y);
        doc.text(`Date: ${receipt.date || 'N/A'}`, 150, y);
        y += 10;
        
        // Customer Information
        doc.setFont(undefined, 'bold');
        doc.text('Customer Information', 20, y);
        doc.setFont(undefined, 'normal');
        y += 10;
        
        doc.text(`Name: ${receipt.customer_name || 'N/A'}`, 20, y);
        y += 7;
        doc.text(`Phone: ${receipt.customer_phone || 'N/A'}`, 20, y);
        y += 10;
        
        // Products Table
        doc.setFont(undefined, 'bold');
        doc.text('Products', 20, y);
        y += 10;
        
        try {
            const products = JSON.parse(receipt.products || '[]');
            if (products.length > 0) {
                const headers = [['Product', 'Price', 'Qty', 'Total']];
                const data = products.map(p => [
                    p.name || 'N/A',
                    `₹${Number(p.price || 0).toFixed(2)}`,
                    p.quantity || 1,
                    `₹${(Number(p.price || 0) * Number(p.quantity || 1)).toFixed(2)}`
                ]);
                
                doc.autoTable({
                    startY: y,
                    head: headers,
                    body: data,
                    theme: 'grid',
                    headStyles: { fillColor: [37, 99, 235] },
                    margin: { left: 20, right: 20 }
                });
                
                y = doc.lastAutoTable.finalY + 10;
                
                // Calculate total
                const total = products.reduce((sum, p) => {
                    return sum + (Number(p.price || 0) * Number(p.quantity || 1));
                }, 0);
                
                doc.text(`Total: ₹${total.toFixed(2)}`, 20, y);
                y += 10;
            }
        } catch (e) {
            console.error('Error processing products:', e);
            doc.text('Error loading products', 20, y);
            y += 10;
        }
        
        // Add footer
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('Thank you for your business!', 105, 280, { align: 'center' });
        
        // Save the PDF
        doc.save(`receipt-${receipt.id || Date.now()}.pdf`);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    }
}

// Function to populate receipts table
function populateReceiptsTable(receipts) {
    const tbody = document.getElementById('receipts-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = ''; // Clear existing rows
    
    receipts.forEach(receipt => {
        try {
            const row = document.createElement('tr');
            const products = JSON.parse(receipt.products || '[]');
            const firstProduct = products[0] || {};
            
            // Calculate total amount
            const total = products.reduce((sum, p) => {
                return sum + (Number(p.price || 0) * Number(p.quantity || 1));
            }, 0);
            
            row.innerHTML = `
                <td>${receipt.date || 'N/A'}</td>
                <td>${firstProduct.name || 'N/A'}</td>
                <td>₹${total.toFixed(2)}</td>
                <td>${receipt.warranty_months || '0'} months</td>
                <td>
                    <button onclick="downloadReceiptAsPdf(${JSON.stringify(receipt).replace(/"/g, '&quot;')})" 
                            class="download-btn" 
                            style="background: #2563eb; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer;">
                        <span class="material-icons" style="font-size: 16px; vertical-align: middle;">download</span>
                        Download
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
            
        } catch (e) {
            console.error('Error processing receipt:', e);
        }
    });
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing dashboard...');
    try {
        loadDashboard();
        setupReceiptsModal();
        
        // Initialize Add Receipt button
        const addReceiptBtn = document.getElementById('fab-add-receipt');
        if (addReceiptBtn) {
            addReceiptBtn.addEventListener('click', function() {
                const modal = document.getElementById('receipt-modal');
                if (modal) {
                    modal.style.display = 'flex';
                }
            });
        }
        
        // Initialize Cancel button in receipt modal
        const cancelBtn = document.getElementById('cancel-receipt');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                const modal = document.getElementById('receipt-modal');
                const form = document.getElementById('add-receipt-form');
                if (modal) modal.style.display = 'none';
                if (form) form.reset();
            });
        }
        
        console.log('Dashboard initialization complete');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
});

