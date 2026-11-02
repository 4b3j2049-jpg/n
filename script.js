// 網頁區塊滑入效果

const sections = document.querySelectorAll('.section');

const observer = new IntersectionObserver((entries) => {

    entries.forEach(entry => {

        if (entry.isIntersecting) {
            entry.target.classList.add('show');
        }

    });

}, {
    threshold: 0.15
});

sections.forEach(section => {
    section.classList.add('hidden');
    observer.observe(section);
});


// 點擊導覽列平滑移動

document.querySelectorAll('nav a').forEach(link => {

    link.addEventListener('click', function(e) {

        const target = document.querySelector(this.getAttribute('href'));

        if (target) {
            e.preventDefault();

            target.scrollIntoView({
                behavior: 'smooth'
            });
        }

    });

});