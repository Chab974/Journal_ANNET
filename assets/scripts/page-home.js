(() => {
            const carousel = document.querySelector('[data-hero-carousel]');
            if (!carousel) {
                return;
            }

            const slides = Array.from(carousel.querySelectorAll('[data-hero-slide]'));
            const previousButton = carousel.querySelector('[data-hero-prev]');
            const nextButton = carousel.querySelector('[data-hero-next]');
            const dots = Array.from(carousel.querySelectorAll('[data-hero-dot]'));
            const counter = carousel.querySelector('[data-hero-counter]');

            if (slides.length <= 1 || !previousButton || !nextButton) {
                return;
            }

            let activeIndex = 0;
            let autoRotateId = null;

            function renderSlides() {
                slides.forEach((slide, index) => {
                    const isActive = index === activeIndex;
                    slide.hidden = !isActive;
                    slide.setAttribute('aria-hidden', String(!isActive));
                });

                dots.forEach((dot, index) => {
                    dot.setAttribute('aria-pressed', String(index === activeIndex));
                });

                if (counter) {
                    counter.textContent = `${activeIndex + 1} / ${slides.length}`;
                }
            }

            function goTo(index) {
                activeIndex = (index + slides.length) % slides.length;
                renderSlides();
            }

            function stopAutoRotate() {
                if (autoRotateId) {
                    window.clearInterval(autoRotateId);
                    autoRotateId = null;
                }
            }

            function startAutoRotate() {
                stopAutoRotate();
                autoRotateId = window.setInterval(() => {
                    goTo(activeIndex + 1);
                }, 7000);
            }

            previousButton.addEventListener('click', () => {
                goTo(activeIndex - 1);
                startAutoRotate();
            });

            nextButton.addEventListener('click', () => {
                goTo(activeIndex + 1);
                startAutoRotate();
            });

            dots.forEach((dot, index) => {
                dot.addEventListener('click', () => {
                    goTo(index);
                    startAutoRotate();
                });
            });

            carousel.addEventListener('mouseenter', stopAutoRotate);
            carousel.addEventListener('mouseleave', startAutoRotate);
            carousel.addEventListener('focusin', stopAutoRotate);
            carousel.addEventListener('focusout', startAutoRotate);

            renderSlides();
            startAutoRotate();
        })();
