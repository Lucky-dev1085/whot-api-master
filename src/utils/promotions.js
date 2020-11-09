'use strict';
const moment = require('moment');

function error(message) {
  return { message };
}

async function consumePromoCode(serial, playerDetail, sequelizeModels, silentErrors) {
  const promotionCodeModel = sequelizeModels.promotion_code;
  const code = await promotionCodeModel.findOne({
    where: {
      serial: serial,
    }
  });
  if (!code) {
    if (silentErrors) {
      return null;
    }
    throw error('Incorrect promotion code serial number');
  }

  if (code.status != 'unused' || code.availableUsages <= 0) {
    if (silentErrors) {
      return null;
    }
    throw error('Promotion code has expired');
  }

  const promotion = await code.getPromotion();
  if (promotion && moment(promotion.expiresAt).isBefore()) {
    throw error('Promotion has expired');
  }

  const [upCount, upRows] = await promotionCodeModel.update({
    availableUsages: code.availableUsages - 1,
    status: code.availableUsages > 1 ? code.status : 'used',
  }, { where: {
    serial: serial,
    status: 'unused',
    availableUsages: { $gt: 0 },
  }});

  if (!upCount) {
    if (silentErrors) {
      return null;
    }
    throw error('Promotion code has expired');
  }

  const playerDepositModel = sequelizeModels.player_deposit;
  return await playerDepositModel.create({
    amount: code.value,
    origin: 'promotion_code',
    originDetail: code.serial,
    playerDetailId: playerDetail.id,
  });    
}

module.exports = {
  consumePromoCode: consumePromoCode,
};
