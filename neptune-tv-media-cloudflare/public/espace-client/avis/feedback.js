const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const token = params.get('token') || '';
const preselectedScore = Number(params.get('score'));

loadFeedback();

$('#feedbackForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const satisfaction = Number(new FormData(event.currentTarget).get('satisfaction'));
  if (!satisfaction) return showMessage('Choisissez une note de satisfaction.');

  const button = $('#submitFeedback');
  button.disabled = true;
  showMessage('Enregistrement de votre avis…', false);
  try {
    const response = await fetch('/api/client/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        token,
        satisfaction,
        experience: $('#experience').value.trim(),
        recommendTo: $('#recommendTo').value.trim(),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'feedback_failed');
    $('#feedbackForm').hidden = true;
    $('#feedbackDone').hidden = false;
  } catch (error) {
    showMessage(errorText(error.message));
    button.disabled = false;
  }
});

async function loadFeedback() {
  if (!token) return fail('Ce lien d’avis est incomplet.');
  try {
    const response = await fetch(`/api/client/feedback?token=${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'feedback_failed');
    if (result.submitted) {
      $('#feedbackIntro').textContent = 'Votre avis a déjà été enregistré.';
      $('#feedbackDone').hidden = false;
      return;
    }
    $('#feedbackIntro').textContent = `${result.title || 'Votre passage Neptune Media'}${result.format ? ` · ${result.format}` : ''}. Trois réponses rapides nous permettent d’améliorer l’expérience.`;
    $('#feedbackForm').hidden = false;
    if (Number.isInteger(preselectedScore) && preselectedScore >= 1 && preselectedScore <= 5) {
      const input = document.querySelector(`input[name="satisfaction"][value="${preselectedScore}"]`);
      if (input) input.checked = true;
    }
  } catch (error) {
    fail(errorText(error.message));
  }
}

function fail(text) {
  $('#feedbackIntro').textContent = text;
  $('#feedbackForm').hidden = true;
}

function showMessage(text, error = true) {
  const target = $('#feedbackMessage');
  target.textContent = text;
  target.style.color = error ? '#bb314e' : '#5f6d89';
}

function errorText(code) {
  return ({
    invalid_feedback_token: 'Ce lien d’avis est invalide.',
    invalid_or_expired_feedback_token: 'Ce lien d’avis a expiré ou a déjà été remplacé.',
    invalid_feedback: 'Choisissez une note comprise entre 1 et 5.',
  })[code] || 'Votre avis n’a pas pu être enregistré. Réessayez.';
}
