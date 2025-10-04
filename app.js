const jobsContainer = document.getElementById('jobsContainer');
const layoutsContainer = document.getElementById('layoutsContainer');
const preview = document.getElementById('preview');
const previewWrapper = document.getElementById('previewWrapper');
const exportButton = document.getElementById('exportButton');
const showGridToggle = document.getElementById('showGridToggle');
const jobCardTemplate = document.getElementById('jobCardTemplate');
const reloadButton = document.getElementById('reloadDataButton');
const dataStatus = document.getElementById('dataStatus');

const state = {
  jobs: [],
  layouts: [],
  selectedJobs: new Set(),
  selectedLayoutId: null,
  isLoading: false,
  lastLoadedAt: null,
};

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Không thể tải dữ liệu từ ${path}`);
  }
  return response.json();
}

async function fetchJobsData() {
  const index = await fetchJson('data/jobs/index.json');
  if (!Array.isArray(index)) {
    throw new Error('Dữ liệu công việc không hợp lệ.');
  }

  const jobs = await Promise.all(
    index.map(async (entry) => {
      const fileName = typeof entry.file === 'string' ? entry.file : null;
      if (!fileName) {
        console.warn('Bỏ qua mục công việc vì thiếu đường dẫn tệp:', entry);
        return null;
      }

      try {
        const data = await fetchJson(`data/jobs/${fileName}`);
        const id = data.id ?? entry.id ?? fileName.replace(/\.json$/i, '');
        return { ...data, id };
      } catch (error) {
        console.error(error);
        return null;
      }
    })
  );

  return jobs.filter(Boolean);
}

async function fetchLayoutsData() {
  const layouts = await fetchJson('data/layouts.json');
  if (!Array.isArray(layouts)) {
    throw new Error('Dữ liệu layout không hợp lệ.');
  }
  return layouts;
}

function showLoadingPlaceholders() {
  jobsContainer.innerHTML = '<p class="loading">Đang tải danh sách công việc...</p>';
  layoutsContainer.innerHTML = '<p class="loading">Đang tải layout...</p>';
  preview.className = 'preview';
  preview.innerHTML =
    '<div class="preview__loading"><p>Đang tải dữ liệu mới, vui lòng chờ...</p></div>';
  exportButton.disabled = true;
}

function setLoadingUi(isLoading) {
  reloadButton.disabled = isLoading;
  reloadButton.textContent = isLoading ? 'Đang tải...' : 'Tải dữ liệu mới';
  reloadButton.setAttribute('aria-busy', isLoading ? 'true' : 'false');
}

function updateStatus(message, status) {
  if (!dataStatus) return;
  dataStatus.textContent = message;
  dataStatus.dataset.state = status;
}

function formatTime(date) {
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

async function loadData({ preserveSelection = true } = {}) {
  if (state.isLoading) {
    return;
  }

  state.isLoading = true;
  updateStatus('Đang tải dữ liệu...', 'loading');
  setLoadingUi(true);
  showLoadingPlaceholders();

  const previousSelection = preserveSelection ? new Set(state.selectedJobs) : new Set();
  const previousLayoutId = preserveSelection ? state.selectedLayoutId : null;

  try {
    const [jobs, layouts] = await Promise.all([fetchJobsData(), fetchLayoutsData()]);

    state.jobs = jobs;
    state.layouts = layouts;

    const availableJobIds = new Set(jobs.map((job) => job.id));
    const selectedJobIds = preserveSelection
      ? [...previousSelection].filter((id) => availableJobIds.has(id))
      : [];
    state.selectedJobs = new Set(selectedJobIds);

    const hasPreviousLayout =
      previousLayoutId !== null && layouts.some((layout) => layout.id === previousLayoutId);
    state.selectedLayoutId = hasPreviousLayout ? previousLayoutId : layouts[0]?.id ?? null;

    renderJobList();
    renderLayoutOptions();

    const now = new Date();
    state.lastLoadedAt = now;
    updateStatus(`Đã cập nhật lúc ${formatTime(now)}`, 'success');
  } catch (error) {
    console.error(error);
    state.jobs = [];
    state.layouts = [];
    state.selectedJobs = new Set();
    state.selectedLayoutId = null;
    jobsContainer.innerHTML = `<p class="error">${error.message}</p>`;
    layoutsContainer.innerHTML = `<p class="error">${error.message}</p>`;
    renderPreview();
    updateStatus('Tải dữ liệu thất bại. Thử lại.', 'error');
  } finally {
    state.isLoading = false;
    setLoadingUi(false);
  }
}

function renderJobList() {
  jobsContainer.innerHTML = '';

  if (state.jobs.length === 0) {
    jobsContainer.innerHTML = '<p class="empty">Chưa có dữ liệu công việc.</p>';
    return;
  }

  state.jobs.forEach((job) => {
    const label = document.createElement('label');
    label.className = 'job-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = job.id;
    checkbox.checked = state.selectedJobs.has(job.id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        state.selectedJobs.add(job.id);
      } else {
        state.selectedJobs.delete(job.id);
      }
      renderPreview();
    });

    const meta = document.createElement('div');
    meta.className = 'job-item__meta';

    const title = document.createElement('p');
    title.className = 'job-item__title';
    title.textContent = job.title;

    const company = document.createElement('p');
    company.className = 'job-item__company';
    company.textContent = job.company;

    const location = document.createElement('p');
    location.className = 'job-item__location';
    location.textContent = job.location;

    meta.append(title, company, location);
    label.append(checkbox, meta);
    jobsContainer.append(label);
  });
}

function renderLayoutOptions() {
  layoutsContainer.innerHTML = '';

  if (state.layouts.length === 0) {
    layoutsContainer.innerHTML = '<p class="empty">Chưa có layout để lựa chọn.</p>';
    return;
  }

  state.layouts.forEach((layout, index) => {
    const label = document.createElement('label');
    label.className = 'layout-item';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'layout';
    radio.value = layout.id;
    const shouldSelect =
      state.selectedLayoutId === null ? index === 0 : state.selectedLayoutId === layout.id;
    radio.checked = shouldSelect;

    if (shouldSelect) {
      state.selectedLayoutId = layout.id;
    }

    radio.addEventListener('change', () => {
      if (radio.checked) {
        state.selectedLayoutId = layout.id;
        renderPreview();
      }
    });

    const details = document.createElement('div');

    const title = document.createElement('p');
    title.className = 'layout-item__title';
    title.textContent = layout.name;

    const description = document.createElement('p');
    description.className = 'layout-item__description';
    description.textContent = layout.description;

    const tag = document.createElement('span');
    tag.className = 'layout-tag';
    tag.textContent = `ID: ${layout.id}`;

    details.append(title, description, tag);
    label.append(radio, details);
    layoutsContainer.append(label);
  });

  renderPreview();
}

function renderPreview() {
  preview.className = 'preview';
  preview.innerHTML = '';

  const layout = state.layouts.find((item) => item.id === state.selectedLayoutId);
  const selectedJobs = state.jobs.filter((job) => state.selectedJobs.has(job.id));

  if (!layout || selectedJobs.length === 0) {
    exportButton.disabled = true;
    const empty = document.createElement('div');
    empty.className = 'preview__empty';

    const title = document.createElement('h3');
    title.textContent = 'Chưa có dữ liệu để hiển thị';

    const description = document.createElement('p');
    description.textContent = 'Hãy chọn ít nhất một công việc và một layout để xem trước nội dung bài đăng.';

    empty.append(title, description);
    preview.append(empty);
    return;
  }

  exportButton.disabled = false;
  preview.classList.add(`preview-layout--${layout.id}`);

  const primaryJob = selectedJobs[0];
  const primaryCompany = primaryJob.company ?? layout.headerSubtitle ?? 'Doanh nghiệp';

  const header = document.createElement('header');
  header.className = 'preview__header';

  const headerSubtitle = document.createElement('p');
  headerSubtitle.className = 'preview__header-subtitle';
  headerSubtitle.textContent = layout.headerSubtitle ?? 'Tuyển dụng';

  const headerTitle = document.createElement('h1');
  headerTitle.className = 'preview__header-title';
  headerTitle.textContent = layout.headerTitle ?? 'We are hiring';

  const headerCompany = document.createElement('p');
  headerCompany.className = 'preview__header-company';
  headerCompany.textContent = primaryCompany;

  const tagline = document.createElement('p');
  tagline.className = 'preview__tagline';
  tagline.textContent = layout.tagline ?? '';

  header.append(headerSubtitle, headerTitle, headerCompany);
  if (layout.tagline) {
    header.append(tagline);
  }

  const body = document.createElement('section');
  body.className = 'preview__body';

  const jobsWrapper = document.createElement('div');
  jobsWrapper.className = 'preview__jobs';
  selectedJobs.forEach((job) => {
    jobsWrapper.append(createJobCard(job));
  });

  body.append(jobsWrapper);

  const benefits = Array.from(
    new Set(
      selectedJobs.flatMap((job) => Array.isArray(job.benefits) ? job.benefits : [])
    )
  );
  if (benefits.length > 0) {
    const benefitsSection = document.createElement('section');
    benefitsSection.className = 'preview__benefits';

    const benefitsTitle = document.createElement('h3');
    benefitsTitle.className = 'preview__benefits-title';
    benefitsTitle.textContent = 'Chế độ đãi ngộ';

    const benefitsList = document.createElement('ul');
    benefitsList.className = 'preview__benefits-list';
    benefits.forEach((benefit) => {
      const li = document.createElement('li');
      li.textContent = benefit;
      benefitsList.append(li);
    });

    benefitsSection.append(benefitsTitle, benefitsList);
    body.append(benefitsSection);
  }

  const footer = document.createElement('footer');
  footer.className = 'preview__footer';

  if (layout.tagline) {
    const footerTagline = document.createElement('p');
    footerTagline.textContent = layout.tagline;
    footer.append(footerTagline);
  }

  const footerItems = document.createElement('div');
  footerItems.className = 'preview__footer-items';

  const applyItem = document.createElement('div');
  applyItem.className = 'preview__footer-item';
  const applyLabel = document.createElement('span');
  applyLabel.textContent = layout.footer?.applyLabel ?? 'Nộp hồ sơ';
  const applyContent = document.createElement('p');
  applyContent.textContent = primaryJob.apply?.instructions ?? 'Liên hệ bộ phận nhân sự để được hướng dẫn.';
  applyItem.append(applyLabel, applyContent);
  if (primaryJob.apply?.deadline) {
    const deadline = document.createElement('p');
    deadline.innerHTML = `<strong>Hạn chót:</strong> ${primaryJob.apply.deadline}`;
    applyItem.append(deadline);
  }
  if (primaryJob.apply?.applyLink) {
    const applyLink = document.createElement('a');
    applyLink.href = primaryJob.apply.applyLink;
    applyLink.textContent = 'Link ứng tuyển';
    applyLink.target = '_blank';
    applyLink.rel = 'noopener noreferrer';
    applyItem.append(applyLink);
  }

  const interviewItem = document.createElement('div');
  interviewItem.className = 'preview__footer-item';
  const interviewLabel = document.createElement('span');
  interviewLabel.textContent = layout.footer?.interviewLabel ?? 'Địa điểm phỏng vấn';
  const interviewContent = document.createElement('p');
  interviewContent.textContent = primaryJob.interviewAddress ?? 'Sẽ thông báo sau khi đạt phỏng vấn.';
  interviewItem.append(interviewLabel, interviewContent);

  const contactItem = document.createElement('div');
  contactItem.className = 'preview__footer-item';
  const contactLabel = document.createElement('span');
  contactLabel.textContent = layout.footer?.contactLabel ?? 'Liên hệ';
  const contactContent = document.createElement('p');
  const applyDeadline = primaryJob.apply?.deadline;
  const contactPhone = primaryJob.contactPhone ?? '---';
  contactContent.textContent = applyDeadline
    ? `${contactPhone} • Hạn chót: ${applyDeadline}`
    : contactPhone;
  contactItem.append(contactLabel, contactContent);

  footerItems.append(applyItem, interviewItem, contactItem);
  footer.append(footerItems);

  preview.append(header, body, footer);
}

function createJobCard(job) {
  const fragment = jobCardTemplate.content.cloneNode(true);
  const title = fragment.querySelector('.job-card__title');
  const department = fragment.querySelector('.job-card__department');
  const location = fragment.querySelector('.job-card__location');
  const descriptionList = fragment.querySelector('.job-card__description');
  const requirementsList = fragment.querySelector('.job-card__requirements');

  title.textContent = job.title;
  if (job.department) {
    department.textContent = job.department;
  } else {
    department.remove();
  }

  if (job.location) {
    location.textContent = job.location;
  } else {
    location.remove();
  }

  fillList(descriptionList, job.description);
  fillList(requirementsList, job.requirements);

  return fragment;
}

function fillList(listElement, items) {
  listElement.innerHTML = '';
  if (!Array.isArray(items) || items.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'Đang cập nhật.';
    listElement.append(empty);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    listElement.append(li);
  });
}

async function handleExport() {
  const html2canvasInstance = getHtml2canvas();
  exportButton.disabled = true;
  exportButton.textContent = 'Đang xuất...';
  try {
    document.body.classList.add('is-exporting');
    preview.classList.add('preview--export');
    await nextFrame();
    await nextFrame();
    const canvas = await html2canvasInstance(preview, {
      backgroundColor: '#ffffff',
      scale: window.devicePixelRatio < 2 ? 2 : window.devicePixelRatio,
    });
    const blob = await canvasToBlob(canvas);
    const layout = state.layouts.find((item) => item.id === state.selectedLayoutId);
    const company = state.jobs.find((job) => state.selectedJobs.has(job.id))?.company ?? 'tuyendung';
    const filename = `${slugify(company)}-${layout?.id ?? 'layout'}-${new Date()
      .toISOString()
      .slice(0, 10)}.png`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    alert(error.message);
  } finally {
    preview.classList.remove('preview--export');
    document.body.classList.remove('is-exporting');
    exportButton.disabled = false;
    exportButton.textContent = 'Xuất hình ảnh';
  }
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Không thể tạo hình ảnh.'));
        }
      },
      'image/png',
      1
    );
  });
}

function getHtml2canvas() {
  const instance = globalThis.html2canvas;
  if (typeof instance !== 'function') {
    throw new Error('Thư viện html2canvas chưa sẵn sàng. Vui lòng thử lại sau.');
  }
  return instance;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

showGridToggle.addEventListener('change', () => {
  previewWrapper.classList.toggle('hide-grid', !showGridToggle.checked);
});

previewWrapper.classList.toggle('hide-grid', !showGridToggle.checked);

exportButton.addEventListener('click', handleExport);

reloadButton.addEventListener('click', () => {
  loadData({ preserveSelection: true });
});

loadData();
