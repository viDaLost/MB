import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('application shell', () => {
  it('presents both games and accessible preferences', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /Выберите игру/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Начать мафию' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Начать бункер' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));
    expect(screen.getByRole('dialog', { name: 'Настройки приложения' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Тактильный отклик/ })).toBeChecked();
  });

  it('loads a game route as a separate chunk', async () => {
    window.location.hash = '#/mafia';
    render(<App />);

    expect(await screen.findByText('Количество игроков')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Мафия' })).toBeInTheDocument();
  });
});
