local message = "openRender LOVE2D minimal"

function love.draw()
  love.graphics.clear(0.08, 0.09, 0.11)
  love.graphics.setColor(1, 1, 1)
  love.graphics.print(message, 32, 32)
end
