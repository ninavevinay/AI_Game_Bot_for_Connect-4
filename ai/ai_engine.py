import json
import math
import random
import sys

ROWS = 6
COLS = 7
HUMAN = 'R'
AI = 'Y'
EMPTY = None


def create_board():
    return [[EMPTY for _ in range(COLS)] for _ in range(ROWS)]


def copy_board(board):
    return [row[:] for row in board]


def get_next_open_row(board, col):
    for r in range(ROWS - 1, -1, -1):
        if board[r][col] == EMPTY:
            return r
    return -1


def valid_locations(board):
    return [c for c in range(COLS) if board[0][c] == EMPTY]


def drop_piece(board, row, col, piece):
    new_board = copy_board(board)
    new_board[row][col] = piece
    return new_board


def winning_move(board, piece):
    for r in range(ROWS):
        for c in range(COLS - 3):
            if (
                board[r][c] == piece
                and board[r][c + 1] == piece
                and board[r][c + 2] == piece
                and board[r][c + 3] == piece
            ):
                return True

    for c in range(COLS):
        for r in range(ROWS - 3):
            if (
                board[r][c] == piece
                and board[r + 1][c] == piece
                and board[r + 2][c] == piece
                and board[r + 3][c] == piece
            ):
                return True

    for r in range(ROWS - 3):
        for c in range(COLS - 3):
            if (
                board[r][c] == piece
                and board[r + 1][c + 1] == piece
                and board[r + 2][c + 2] == piece
                and board[r + 3][c + 3] == piece
            ):
                return True

    for r in range(3, ROWS):
        for c in range(COLS - 3):
            if (
                board[r][c] == piece
                and board[r - 1][c + 1] == piece
                and board[r - 2][c + 2] == piece
                and board[r - 3][c + 3] == piece
            ):
                return True

    return False


def is_terminal(board):
    return winning_move(board, HUMAN) or winning_move(board, AI) or len(valid_locations(board)) == 0


def evaluate_window(window, piece):
    opp = HUMAN if piece == AI else AI
    count_piece = window.count(piece)
    count_opp = window.count(opp)
    count_empty = window.count(EMPTY)

    score = 0
    if count_piece == 4:
        score += 100000
    elif count_piece == 3 and count_empty == 1:
        score += 50
    elif count_piece == 2 and count_empty == 2:
        score += 10

    if count_opp == 3 and count_empty == 1:
        score -= 80
    if count_opp == 4:
        score -= 100000

    return score


def score_position(board, piece):
    score = 0
    center = [row[COLS // 2] for row in board]
    score += center.count(piece) * 6

    for r in range(ROWS):
        for c in range(COLS - 3):
            window = [board[r][c + i] for i in range(4)]
            score += evaluate_window(window, piece)

    for c in range(COLS):
        for r in range(ROWS - 3):
            window = [board[r + i][c] for i in range(4)]
            score += evaluate_window(window, piece)

    for r in range(ROWS - 3):
        for c in range(COLS - 3):
            window = [board[r + i][c + i] for i in range(4)]
            score += evaluate_window(window, piece)

    for r in range(3, ROWS):
        for c in range(COLS - 3):
            window = [board[r - i][c + i] for i in range(4)]
            score += evaluate_window(window, piece)

    return score


def minimax_move(board, depth):
    nodes_visited = 0

    def recurse(state, depth, alpha, beta, maximizing):
        nonlocal nodes_visited
        nodes_visited += 1
        terminal = is_terminal(state)
        if depth == 0 or terminal:
            if terminal:
                if winning_move(state, AI):
                    return None, 100000000
                if winning_move(state, HUMAN):
                    return None, -100000000
                return None, 0
            return None, score_position(state, AI)

        valid = valid_locations(state)
        if maximizing:
            value = -math.inf
            best_col = random.choice(valid)
            for col in valid:
                row = get_next_open_row(state, col)
                new_board = drop_piece(state, row, col, AI)
                _, new_score = recurse(new_board, depth - 1, alpha, beta, False)
                if new_score > value:
                    value = new_score
                    best_col = col
                alpha = max(alpha, value)
                if alpha >= beta:
                    break
            return best_col, value

        value = math.inf
        best_col = random.choice(valid)
        for col in valid:
            row = get_next_open_row(state, col)
            new_board = drop_piece(state, row, col, HUMAN)
            _, new_score = recurse(new_board, depth - 1, alpha, beta, True)
            if new_score < value:
                value = new_score
                best_col = col
            beta = min(beta, value)
            if alpha >= beta:
                break
        return best_col, value

    col, score = recurse(board, depth, -math.inf, math.inf, True)
    return col, score, nodes_visited


def minimax_tree(board, depth):
    nodes = []
    node_id = 0

    def recurse(state, depth, alpha, beta, maximizing, parent_id, move, ply):
        nonlocal node_id
        current_id = node_id
        node_id += 1
        node = {
            'id': current_id,
            'parentId': parent_id,
            'depth': ply,
            'move': move,
            'score': 0,
            'isBest': False,
        }
        nodes.append(node)

        terminal = is_terminal(state)
        if depth == 0 or terminal:
            if terminal:
                if winning_move(state, AI):
                    node['score'] = 100000000
                elif winning_move(state, HUMAN):
                    node['score'] = -100000000
                else:
                    node['score'] = 0
            else:
                node['score'] = score_position(state, AI)
            return node['score'], [current_id]

        valid = valid_locations(state)
        if maximizing:
            best_score = -math.inf
            best_path = [current_id]
            for col in valid:
                row = get_next_open_row(state, col)
                new_board = drop_piece(state, row, col, AI)
                score, path = recurse(new_board, depth - 1, alpha, beta, False, current_id, col, ply + 1)
                if score > best_score:
                    best_score = score
                    best_path = [current_id] + path
                alpha = max(alpha, best_score)
                if alpha >= beta:
                    break
            node['score'] = best_score
            return best_score, best_path

        best_score = math.inf
        best_path = [current_id]
        for col in valid:
            row = get_next_open_row(state, col)
            new_board = drop_piece(state, row, col, HUMAN)
            score, path = recurse(new_board, depth - 1, alpha, beta, True, current_id, col, ply + 1)
            if score < best_score:
                best_score = score
                best_path = [current_id] + path
            beta = min(beta, best_score)
            if alpha >= beta:
                break
        node['score'] = best_score
        return best_score, best_path

    score, best_path = recurse(board, depth, -math.inf, math.inf, True, None, None, 0)
    best_set = set(best_path)
    for node in nodes:
        if node['id'] in best_set:
            node['isBest'] = True

    best_col = None
    if len(best_path) >= 2:
        best_child_id = best_path[1]
        for node in nodes:
            if node['id'] == best_child_id:
                best_col = node['move']
                break

    return best_col, score, nodes


def simulate_winrate(games, depth):
    ai_wins = 0
    human_wins = 0
    draws = 0

    for g in range(games):
        board = create_board()
        current = HUMAN if g % 2 == 0 else AI
        while True:
            if current == AI:
                col, _, _ = minimax_move(board, depth)
                if col is None:
                    draws += 1
                    break
            else:
                valid = valid_locations(board)
                if not valid:
                    draws += 1
                    break
                col = random.choice(valid)

            row = get_next_open_row(board, col)
            board = drop_piece(board, row, col, current)

            if winning_move(board, current):
                if current == AI:
                    ai_wins += 1
                else:
                    human_wins += 1
                break

            if len(valid_locations(board)) == 0:
                draws += 1
                break

            current = HUMAN if current == AI else AI

    total = max(1, games)
    ai_win_rate = round((ai_wins / total) * 100)
    human_win_rate = round((human_wins / total) * 100)
    draw_rate = round((draws / total) * 100)
    return {
        'ai_wins': ai_wins,
        'human_wins': human_wins,
        'draws': draws,
        'ai_win_rate': ai_win_rate,
        'human_win_rate': human_win_rate,
        'draw_rate': draw_rate,
    }


def main():
    payload = json.loads(sys.stdin.read() or '{}')
    action = payload.get('action')
    board = payload.get('board') or create_board()
    depth = int(payload.get('depth') or 3)

    if action == 'move':
        col, score, nodes = minimax_move(board, depth)
        output = { 'col': col, 'score': score, 'nodes_visited': nodes }
    elif action == 'tree':
        col, score, nodes = minimax_tree(board, depth)
        output = { 'col': col, 'score': score, 'nodes': nodes }
    elif action == 'winrate':
        games = int(payload.get('games') or 50)
        games = max(1, min(games, 500))
        output = simulate_winrate(games, depth)
    else:
        output = { 'error': 'Unknown action' }

    sys.stdout.write(json.dumps(output))


if __name__ == '__main__':
    main()
