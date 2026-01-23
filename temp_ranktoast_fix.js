function showNewRankToast(userName, newRank) {
    const container = document.getElementById("newranktoast-container") || createNewRankToastContainer();

    // Remove any existing rank toasts before showing new one (only 1 at a time)
    const existingToasts = container.querySelectorAll('.newranktoast');
    existingToasts.forEach(toast => {
        toast.style.transition = "opacity 0.3s, transform 0.3s";
        toast.style.opacity = "0";
        toast.style.transform = "translateX(120%)";
        setTimeout(() => toast.remove(), 300);
    });

    const toast = document.createElement("div");
    toast.classList.add("newranktoast");

    toast.innerHTML = `
    <div class="newranktoast-rank-circle">
      ${newRank}
      <img src="./public/green.png" alt="Rank Up">
    </div>
    <div class="newranktoast-content">
      <h4>${userName} just climbed the leaderboard!</h4>
      <p>They're now ranked <b>#${newRank}</b>. Who can stop them?</p>
    </div>
  `;

    container.appendChild(toast);

    // Auto-remove after 5s
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.transition = "opacity 0.5s, transform 0.5s";
            toast.style.opacity = "0";
            toast.style.transform = "translateX(120%)";
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 500);
        }
    }, 5000);
}
