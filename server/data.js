/* data.js */

let users = new Set();

const registerUser = (userName) => {
    users.add(userName);
    console.log(`User registered: ${userName}`);
}

const unregisterUser = (userName) => {
    users.delete(userName);
    console.log(`User removed: ${userName}`);
}

const isUserNameTaken = (userName) => {
    return users.has(userName);
}

const isUserNameAvailable = (userName) => {
    return !isUserNameTaken(userName);
}


/* Room Class */

class Room {

    /* Static Interface */

    static #rooms = {};

    static get(roomName) {
        if (!Room.#rooms[roomName]) {
            Room.#rooms[roomName] = new Room(roomName);
        }
        return Room.#rooms[roomName];
    }

    /* Instance Methods */

    #name = "";
    #log = [];
    #typingUsers = new Set();

    constructor(name) {
        this.#name = name;
    }

    get name() {
        return this.#name;
    }

    get log() {
        return this.#log;
    }

    get typingUsers() {
        return this.#typingUsers;
    }

    addMessage(messageInfo) {
        messageInfo.timestamp = Date.now();
        this.#log.push(messageInfo);
    }

    updateTypingStatus(userName, isTyping) {
        if (isTyping) {
            this.#typingUsers.add(userName);
        }
        else {
            this.#typingUsers.delete(userName);
        }
    }

    editLastMessage(userName, editedText) {
        for (let i = this.#log.length - 1; i >= 0; i--) {
            const message = this.#log[i];

            const isNormalUserMessage =
                message.sender === userName &&
                message.sender !== "" &&
                !message.newDay &&
                !message.typingFeedback &&
                !message.deletedAt;

            if (isNormalUserMessage) {
                message.text = editedText;
                message.editedAt = Date.now();
                return true;
            }
        }
        return false;
    }

    deleteLastMessage(userName) {
        for (let i = this.#log.length - 1; i >= 0; i--) {
            const message = this.#log[i];

            const isNormalUserMessage =
                message.sender === userName &&
                message.sender !== "" &&
                !message.newDay &&
                !message.typingFeedback &&
                !message.deletedAt;

            if (isNormalUserMessage) {
                message.text = "";
                message.deletedAt = Date.now();
                return true;
            }
        }
        return false;
    }
}


/* Room helpers */

const roomLog = (room) => {
    return Room.get(room).log;
};

const addMessage = (room, messageInfo) => {
    Room.get(room).addMessage(messageInfo);
};

const updateTypingStatus = (roomName, userName, isTyping) => {
    Room.get(roomName).updateTypingStatus(userName, isTyping);
}

const getTypingUsers = (roomName) => {
    return Array.from(Room.get(roomName).typingUsers);
}

const editLastMessage = (roomName, userName, editedText) => {
    return Room.get(roomName).editLastMessage(userName, editedText);
};

const deleteLastMessage = (roomName, userName) => {
    return Room.get(roomName).deleteLastMessage(userName);
};

export {
    registerUser,
    unregisterUser,
    isUserNameTaken,
    isUserNameAvailable,
    roomLog,
    addMessage,
    updateTypingStatus,
    getTypingUsers,
    editLastMessage,
    deleteLastMessage,
};