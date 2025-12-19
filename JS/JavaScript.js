// CONFIG: update these to your values
const GITHUB_USERNAME = 'taal0'; // Replace

document.addEventListener('DOMContentLoaded', () => {
	initTheme();
	renderSkills();
	fetchGitHubRepos(GITHUB_USERNAME);
	bindContactForm();
	bindCopyEmail();
	bindPhoneButton();
});

/* THEME */
function initTheme(){
	const switchEl = document.getElementById('theme-switch');
	const saved = localStorage.getItem('theme');
	// default to dark for premium feel unless user chose otherwise
	if(!switchEl) return;
	if(saved === 'dark' || !saved){
		document.body.classList.add('theme-dark');
		switchEl.checked = true;
	} else {
		document.body.classList.remove('theme-dark');
		switchEl.checked = false;
	}
	switchEl.addEventListener('change', () => {
		const isDark = switchEl.checked;
		document.body.classList.toggle('theme-dark', isDark);
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
		// re-render repos to pick up styles if necessary
		try{ fetchGitHubRepos(GITHUB_USERNAME); }catch(e){/* ignore */}
	});
}

/* GitHub contribution graph (attempt to fetch inline SVG and recolor) */
// Contribution graph removed per user request — keep function stub to avoid runtime errors
async function fetchGitHubContribs(username){
	const target=document.querySelector('#contribs');
	if(!target) return;
	// Clear any existing content and hide the container
	target.innerHTML='';
	target.style.display='none';
	return;
}

/* SKILLS (dynamic) */
const skills = [
	{name:'HTML', level:80},
	{name:'CSS', level:60},
	{name:'JavaScript', level:60},
	{name:'Java', level:70},
	{name:'C++', level:65}
];

function renderSkills(){
	const container = document.getElementById('skills-list');
	container.innerHTML = '';
	// sort: highest level first, tie -> alphabetical
	const sorted = skills.slice().sort((a,b) => {
		if(b.level !== a.level) return b.level - a.level;
		return a.name.localeCompare(b.name, 'tr');
	});
	sorted.forEach((s, idx) => {
		const el = document.createElement('div');
		el.className = 'skill fade-in';
		el.setAttribute('role','group');
		el.setAttribute('tabindex','0');
		el.setAttribute('aria-label', `${s.name}: ${s.level}%`);
		el.setAttribute('data-level', String(s.level));
		el.innerHTML = `<div class="name">${s.name}</div><div class="level" aria-hidden="true"><i style="width:0%"></i></div><span class="percent" aria-hidden="true">${s.level}%</span>`;
		container.appendChild(el);
		// animate bar after insertion
		requestAnimationFrame(()=>{
			const bar = el.querySelector('.level > i');
			if(bar) bar.style.width = `${s.level}%`;
		});
	});
}

/* GitHub widget */
async function fetchGitHubRepos(username){
	// prefer the inline repo-list container if present
	const listEl = document.getElementById('repo-list');
	const widget = document.getElementById('github-widget');
	const target = listEl || widget;
	// Basic input validation and helpful message
	if(!username || String(username).includes('your-')){
		target.innerHTML = '<div class="repo">GitHub kullanıcı adınızı JS içinde ayarlayın (GITHUB_USERNAME).</div>';
		return;
	}
	try{
		target.innerHTML = '<div class="loader small"></div>';
		const res = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=5`);
		if(!res.ok){
			// Handle rate limit / auth issues more clearly
			if(res.status === 403) {
				widget.innerHTML = `<div class="repo error">API rate limit aşıldı veya erişim engellendi (HTTP ${res.status}). Auth veya caching gerekebilir.</div>`;
			} else if(res.status === 404){
				widget.innerHTML = `<div class="repo error">Kullanıcı bulunamadı (HTTP ${res.status}).</div>`;
			} else {
				widget.innerHTML = `<div class="repo error">GitHub yüklenemedi (HTTP ${res.status}).</div>`;
			}
			console.error('GitHub fetch error', res.status, res.statusText);
			return;
		}
		const repos = await res.json();
		if(!Array.isArray(repos) || repos.length === 0){
			target.innerHTML = `<div class="repo">Hiç depo bulunamadı.</div>`;
			return;
		}
		// Build a little list with name, description and meta
		target.innerHTML = '';
		repos.forEach(r => {
			const repo = document.createElement('div');
			repo.className = 'repo fade-in';
			repo.dataset.href = r.html_url;
			const desc = r.description ? `<div class="muted" style="font-size:0.9rem;margin-top:4px">${escapeHtml(r.description)}</div>` : '';
			const updated = new Date(r.updated_at).toLocaleDateString();
			repo.innerHTML = `<a href="${r.html_url}" target="_blank" rel="noopener">${r.name}</a><div class="meta">★ ${r.stargazers_count} • ${r.language || '—'} • güncellendi: ${updated}</div>${desc}`;
			// make entire card clickable (except when clicking the inner anchor)
			repo.addEventListener('click', (e)=>{
				if(e.target && e.target.closest('a')) return; // let the link handle it
				window.open(r.html_url, '_blank', 'noopener');
			});
			// keyboard accessibility: open on Enter/Space
			repo.tabIndex = 0;
			repo.addEventListener('keydown', (e)=>{
				if(e.key === 'Enter' || e.key === ' '){
					e.preventDefault();
					window.open(r.html_url, '_blank', 'noopener');
				}
			});
			target.appendChild(repo);
		});
	}catch(err){
		target.innerHTML = `<div class="repo error">GitHub yüklenemedi — konsolu kontrol edin.</div>`;
		console.error(err);
	}
}

// small helper to avoid inserting raw text into HTML
function escapeHtml(str){
	return String(str).replace(/[&<>"']/g, function(s){
		return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[s];
	});
}

/* CONTACT FORM (AJAX via Formspree)
	NOTE: Replace data-form-endpoint value in the form element with your Formspree endpoint.
*/
function bindContactForm(){
	const form = document.getElementById('contact-form');
	const status = document.getElementById('form-status');
	const endpoint = form.dataset.formEndpoint || '';

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		if(!endpoint || endpoint.includes('your-id')){
			status.textContent = 'Formspree endpoint ayarlayın (JS/HTML içinde).';
			status.className = 'form-status error';
			return;
		}
		const submitBtn = form.querySelector('button[type="submit"]');
		submitBtn.disabled = true; submitBtn.textContent = 'Gönderiliyor...';
		status.textContent = '';
		try{
			const formData = new FormData(form);
			const res = await fetch(endpoint, {
				method:'POST',
				headers:{'Accept':'application/json'},
				body:formData
			});
			const data = await res.json();
			if(res.ok){
				status.textContent = 'Mesaj gönderildi — en kısa zamanda dönüş yapacağım.';
				status.className = 'form-status success';
				form.reset();
			} else {
				status.textContent = (data && data.error) ? data.error : 'Gönderim başarısız oldu.';
				status.className = 'form-status error';
			}
		}catch(err){
			status.textContent = 'Sunucu hatası, lütfen tekrar deneyin.';
			status.className = 'form-status error';
			console.error(err);
		} finally {
			submitBtn.disabled = false; submitBtn.textContent = 'Gönder';
		}
	});
}

/* copy email button */
function bindCopyEmail(){
	const btn = document.getElementById('copy-email');
	btn.addEventListener('click', async () => {
		try{
			await navigator.clipboard.writeText('talatozdemir00@gmail.com');
			btn.textContent = 'E-posta Kopyalandı!';
			setTimeout(()=>btn.textContent='E-postayı Kopyala',1500);
		}catch(err){
			btn.textContent = 'Kopyalama Başarısız';
			setTimeout(()=>btn.textContent='E-postayı Kopyala',1500);
		}
	});
}

/* vCard download */
/* Phone / WhatsApp button binding */
function bindPhoneButton(){
	const PHONE_DEFAULT = '+905056766976'; // Replace with your number in international format
	const btn = document.getElementById('phone-btn');
	if(!btn) return;
	btn.addEventListener('click', ()=>{
		const raw = btn.dataset.phone || PHONE_DEFAULT;
		// normalize to digits only for wa.me (no + or spaces)
		const digits = String(raw).replace(/[^\d]/g, '');
		if(!digits){
			// no number configured
			const orig = btn.textContent;
			btn.textContent = 'Numara ayarlanmamış';
			setTimeout(()=>btn.textContent = orig, 1500);
			return;
		}
		const message = encodeURIComponent('Merhaba');
		const url = `https://wa.me/${digits}?text=${message}`;
		// give small feedback
		const orig = btn.textContent;
		btn.textContent = 'WhatsApp açılıyor…';
		window.open(url, '_blank', 'noopener');
		setTimeout(()=>btn.textContent = orig, 1200);
	});
}

// Info panel removed — function intentionally deleted

