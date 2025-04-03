 -- Use to update discord userId to clerk user ids
UPDATE userData SET userId = 'new_User_Id' WHERE userId = 'discord_user_id';
UPDATE userSettings SET userId = 'new_User_Id' WHERE userId = 'discord_user_id';