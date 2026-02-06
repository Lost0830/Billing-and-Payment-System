// Sound notification utility for alerts and notifications
export class SoundNotification {
  private audioContext: AudioContext | null = null;

  /**
   * Play a beep sound
   * @param frequency - Frequency in Hz (default: 880 Hz)
   * @param duration - Duration in milliseconds (default: 200 ms)
   * @param volume - Volume from 0 to 1 (default: 0.3)
   */
  playBeep(frequency: number = 880, duration: number = 200, volume: number = 0.3): Promise<void> {
    return new Promise((resolve) => {
      try {
        // Use Web Audio API for sound
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          console.warn('Web Audio API not supported');
          resolve();
          return;
        }

        if (!this.audioContext) {
          this.audioContext = new AudioContextClass();
        }

        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration / 1000);

        setTimeout(() => resolve(), duration);
      } catch (error) {
        console.warn('Failed to play beep sound:', error);
        resolve();
      }
    });
  }

  /**
   * Play an invoice notification sound (double beep)
   */
  playInvoiceAlert(): Promise<void> {
    return new Promise(async (resolve) => {
      try {
        await this.playBeep(880, 200, 0.4);
        await this.delay(100);
        await this.playBeep(1000, 200, 0.4);
        resolve();
      } catch (error) {
        console.warn('Failed to play invoice alert sound:', error);
        resolve();
      }
    });
  }

  /**
   * Play a success notification sound
   */
  playSuccessSound(): Promise<void> {
    return new Promise(async (resolve) => {
      try {
        await this.playBeep(523, 150, 0.3);
        await this.delay(50);
        await this.playBeep(659, 150, 0.3);
        await this.delay(50);
        await this.playBeep(784, 200, 0.3);
        resolve();
      } catch (error) {
        console.warn('Failed to play success sound:', error);
        resolve();
      }
    });
  }

  /**
   * Play a transaction/payment sound
   */
  playTransactionSound(): Promise<void> {
    return new Promise(async (resolve) => {
      try {
        await this.playBeep(659, 150, 0.35);
        await this.delay(75);
        await this.playBeep(784, 150, 0.35);
        resolve();
      } catch (error) {
        console.warn('Failed to play transaction sound:', error);
        resolve();
      }
    });
  }

  /**
   * Helper method to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const soundNotification = new SoundNotification();
