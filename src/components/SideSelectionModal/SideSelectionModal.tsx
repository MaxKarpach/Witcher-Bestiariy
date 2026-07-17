import { Modal } from '../Modal/Modal';
import { useModal } from '../../context/ModalContext';
import styles from './SideSelectionModal.module.css';

export function SideSelectionModal() {
  const { modalState, setRollSide, closeModal } = useModal();

  const isOpen = modalState.type === 'parameterRoll' && modalState.step === 'side';

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={closeModal}>
      <p className={styles.title}>Какая вы сторона?</p>
      <div className={styles.buttons}>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonAttack}`}
          onClick={() => setRollSide('attack')}
        >
          Атака
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonDefense}`}
          onClick={() => setRollSide('defense')}
        >
          Защита
        </button>
      </div>
    </Modal>
  );
}
