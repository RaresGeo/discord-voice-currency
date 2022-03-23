const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  guild_id: {
    type: String,
    required: true,
    index: true,
  },
  user_id: {
    type: String,
    required: true,
    index: true,
  },
  points: {
    type: Number,
    required: true,
    default: 0,
  },
  is_active: {
    type: Boolean,
    required: true,
  },
  is_active_since: {
    type: Date,
  },
});

module.exports = mongoose.model('User', userSchema);
