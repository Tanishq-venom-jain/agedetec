from flask import Flask, request, jsonify, render_template
import tempfile
import os
from deepface import DeepFace
from werkzeug.utils import secure_filename

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'no image provided'}), 400

    f = request.files['image']
    if f.filename == '':
        return jsonify({'error': 'empty filename'}), 400

    filename = secure_filename(f.filename)
    suffix = os.path.splitext(filename)[1] or '.jpg'
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        f.save(tmp.name)
        tmp.close()

       
        enforce_param = request.form.get('enforce_detection')
        if enforce_param is None:
            enforce_detection = False
        else:
            enforce_detection = str(enforce_param).lower() in ('1', 'true', 'yes')

        # Use only retinaface (fastest and most accurate)
        try:
            result = DeepFace.analyze(
                img_path=tmp.name,
                actions=['age'],
                enforce_detection=enforce_detection,
                detector_backend='retinaface',
            )
            
            # DeepFace may return a dict or a list (when multiple faces). Use the first face if list.
            if isinstance(result, list) and len(result) > 0:
                result = result[0]
            
            if isinstance(result, dict) and 'age' in result:
                age = result['age']
            else:
                return jsonify({'error': 'could not determine age'}), 500
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        
        # Apply calibration: DeepFace overestimates younger faces by ~8 years
        calibrated_age = age - 8
        calibrated_age = max(1, calibrated_age)
        
        return jsonify({'age': int(round(calibrated_age)), 'confidence': 'retinaface'})
        
        return jsonify({'age': int(round(calibrated_age)), 'confidence': f'{len(ages)}/3 detectors'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        try:
            os.remove(tmp.name)
        except Exception:
            pass


if __name__ == '__main__':
   
    app.run(host='0.0.0.0', port=5000, debug=True)
