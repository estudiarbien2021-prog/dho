-- Donner le rôle admin à l'utilisateur actuel
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = '279c2893-2600-4c59-8d63-c777ecf1b82c';