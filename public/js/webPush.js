const webPush = {
  async subscribe() {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permission denied');
    }

    const publicKey = await fetch('/notification/vapid-public-key').then((r) =>
      r.text(),
    );

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(publicKey),
    });

    const response = await fetch('/notification/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies (access_token)
      body: JSON.stringify(subscription),
    });

    if (response.ok) console.log('Subscribed to web push');
  },
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },
};
export default webPush;
